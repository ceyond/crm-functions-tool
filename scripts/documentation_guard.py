"""Require structured shared-wiki notes for implementation changes."""

from pathlib import Path
import os
import re
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / 'docs/global-wiki'
NOTE_PATTERN = re.compile(r'^raw/\d{4}-\d{2}-\d{2}-.+\.md$')
WIKI_LINK = re.compile(r'\[\[[^\[\]\n]+\]\]')
REQUIRED_HEADINGS = (
    'Existing context reviewed',
    'Problem',
    'Solution',
    'Syntax',
    'Architecture',
    'Validation',
)


def run(*args, cwd=ROOT, check=True):
    result = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result


def git(*args, cwd=ROOT, check=True):
    return run('git', *args, cwd=cwd, check=check)


def requires_note(path):
    """Return whether a project path represents implementation or operations."""
    path = Path(path).as_posix()
    if path == 'docs/global-wiki' or path.startswith('tests/'):
        return False
    if path.startswith('docs/') or path.lower().endswith(('.md', '.rst')):
        return False
    if path == '.gitignore' or path.startswith('.github/pull_request_template'):
        return False
    return True


def validate_note(path, content):
    errors = []
    for heading in REQUIRED_HEADINGS:
        if not re.search(rf'^##\s+{re.escape(heading)}\s*$', content, re.MULTILINE):
            errors.append(f'{path}: missing heading "## {heading}".')
    if not WIKI_LINK.search(content):
        errors.append(f'{path}: at least one wiki link is required.')
    return errors


def evaluate(changed_paths, wiki_changed, notes):
    relevant = sorted(path for path in changed_paths if requires_note(path))
    if not relevant:
        return []
    if not wiki_changed:
        return [
            'Implementation or operational files changed, but the wiki submodule '
            'pointer did not change.',
            'Add a structured note under docs/global-wiki/raw/ and commit the new '
            'wiki pointer. Relevant files: ' + ', '.join(relevant),
        ]
    change_notes = {path: content for path, content in notes.items()
                    if NOTE_PATTERN.match(path)}
    if not change_notes:
        return [
            'The wiki changed, but no dated raw wiki note was added or updated.',
            'Expected: docs/global-wiki/raw/YYYY-MM-DD-project-topic.md',
        ]
    errors = []
    for path, content in sorted(change_notes.items()):
        note_errors = validate_note(path, content)
        if not note_errors:
            return []
        errors.extend(note_errors)
    return errors


def resolve_base():
    configured = os.environ.get('DOCUMENTATION_BASE_REF')
    if configured:
        return configured
    github_base = os.environ.get('GITHUB_BASE_REF')
    if github_base:
        return f'origin/{github_base}'
    upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}',
                   check=False)
    if upstream.returncode == 0:
        return upstream.stdout.strip()
    parent = git('rev-parse', '--verify', 'HEAD^', check=False)
    return 'HEAD^' if parent.returncode == 0 else None


def changed_project_paths(base):
    paths = set()
    if base:
        merge_base = git('merge-base', 'HEAD', base).stdout.strip()
        paths.update(git('diff', '--name-only', f'{merge_base}...HEAD').stdout.splitlines())
    paths.update(git('diff', '--name-only', 'HEAD').stdout.splitlines())
    paths.update(git('ls-files', '--others', '--exclude-standard').stdout.splitlines())
    return paths


def committed_wiki_range(base):
    if not base:
        return None, None
    merge_base = git('merge-base', 'HEAD', base).stdout.strip()
    old = git('rev-parse', f'{merge_base}:docs/global-wiki', check=False)
    new = git('rev-parse', 'HEAD:docs/global-wiki', check=False)
    if old.returncode or new.returncode:
        return None, None
    old_sha, new_sha = old.stdout.strip(), new.stdout.strip()
    return (old_sha, new_sha) if old_sha != new_sha else (None, None)


def note_contents(base):
    notes = {}
    old_sha, new_sha = committed_wiki_range(base)
    if base and not new_sha:
        merge_base = git('merge-base', 'HEAD', base).stdout.strip()
        old = git('rev-parse', f'{merge_base}:docs/global-wiki', check=False)
        new = git('rev-parse', 'HEAD:docs/global-wiki', check=False)
        if old.returncode and new.returncode == 0:
            new_sha = new.stdout.strip()
            changed = git('-C', str(WIKI), 'ls-tree', '-r', '--name-only', new_sha,
                          '--', 'raw').stdout.splitlines()
            for path in changed:
                if NOTE_PATTERN.match(path):
                    content = git('-C', str(WIKI), 'show', f'{new_sha}:{path}', check=False)
                    if content.returncode == 0:
                        notes[path] = content.stdout
            return bool(notes), notes
    pointer = git('rev-parse', 'HEAD:docs/global-wiki', check=False)
    working = git('-C', str(WIKI), 'rev-parse', 'HEAD', check=False)
    if (pointer.returncode == 0 and working.returncode == 0 and
            pointer.stdout.strip() != working.stdout.strip()):
        if not old_sha:
            old_sha, new_sha = pointer.stdout.strip(), working.stdout.strip()
        else:
            new_sha = working.stdout.strip()
    if old_sha and new_sha:
        changed = git('-C', str(WIKI), 'diff', '--name-only', old_sha, new_sha,
                      '--', 'raw').stdout.splitlines()
        for path in changed:
            if NOTE_PATTERN.match(path):
                content = git('-C', str(WIKI), 'show', f'{new_sha}:{path}', check=False)
                if content.returncode == 0:
                    notes[path] = content.stdout

    dirty = set(git('-C', str(WIKI), 'diff', '--name-only', 'HEAD', '--', 'raw').stdout.splitlines())
    dirty.update(git('-C', str(WIKI), 'ls-files', '--others', '--exclude-standard',
                     '--', 'raw').stdout.splitlines())
    for path in dirty:
        if NOTE_PATTERN.match(path):
            notes[path] = (WIKI / path).read_text(encoding='utf-8')
    return bool(old_sha or dirty), notes


def main():
    try:
        base = resolve_base()
        changed = changed_project_paths(base)
        wiki_changed, notes = note_contents(base)
        errors = evaluate(changed, wiki_changed, notes)
    except (RuntimeError, OSError) as error:
        errors = [f'Documentation guard could not inspect the repository: {error}']
    for error in errors:
        print(error, file=sys.stderr)
    print('Documentation guard failed.' if errors else 'Documentation guard passed.')
    return bool(errors)


if __name__ == '__main__':
    sys.exit(main())
