"""Explicit, fail-fast team Git workflow. Requires origin and write access."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
WIKI = ROOT / 'docs/global-wiki'


def run(*args, cwd=ROOT, capture=False):
    result = subprocess.run(args, cwd=cwd, check=True, text=True,
                            stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else ''


def git(*args, cwd=ROOT):
    return run('git', *args, cwd=cwd, capture=True)


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def main(action):
    if action == 'init':
        entry = git('ls-files', '--stage', '--', 'docs/global-wiki')
        if not entry:
            revision = (ROOT / '.wiki-revision').read_text().strip()
            require(len(revision) == 40 and all(c in '0123456789abcdef' for c in revision),
                    'Invalid initial wiki commit in .wiki-revision.')
            run('git', 'update-index', '--add', '--cacheinfo',
                f'160000,{revision},docs/global-wiki')
            print('Wiki gitlink restored. Commit it in the new project after validation.')
        run('git', 'submodule', 'update', '--init', '--recursive')
        return
    require((WIKI / '.git').exists(), 'Run make init first.')
    branch = git('symbolic-ref', '--quiet', '--short', 'HEAD')
    git('remote', 'get-url', 'origin')
    git('remote', 'get-url', 'origin', cwd=WIKI)
    if action == 'update':
        require(not git('status', '--porcelain'), 'Project working tree must be clean; save changes first.')
        require(not git('status', '--porcelain', cwd=WIKI), 'Wiki working tree must be clean.')
        run('git', 'pull', '--ff-only', 'origin', branch)
        run('git', 'submodule', 'update', '--init', '--recursive')
        run('git', 'fetch', 'origin', 'main', cwd=WIKI)
        run('git', 'merge', '--ff-only', 'origin/main', cwd=WIKI)
        print('Wiki updated. Review and commit the changed submodule pointer.')
        return
    require(action == 'sync', 'Allowed actions: update or sync')
    require(not git('diff', '--cached', '--name-only'), 'Project index must be empty; commit staged changes first.')
    changed = set(git('diff', '--name-only', 'HEAD', cwd=WIKI).splitlines())
    changed.update(git('ls-files', '--others', '--exclude-standard', cwd=WIKI).splitlines())
    require(all(name.startswith(('raw/', 'wiki/')) for name in changed),
            'Wiki has changes outside raw/ and wiki/. Review and commit them separately.')
    run('make', 'check')
    run('git', 'add', '--', 'raw', 'wiki', cwd=WIKI)
    if git('diff', '--cached', '--name-only', cwd=WIKI):
        run('git', 'commit', '-m', 'docs: Update shared team knowledge', cwd=WIKI)
    run('git', 'push', 'origin', 'HEAD:refs/heads/main', cwd=WIKI)
    run('git', 'add', '--', 'docs/global-wiki')
    if git('diff', '--cached', '--name-only'):
        run('git', 'commit', '-m', 'chore: Update wiki submodule reference')
    run('git', 'push', 'origin', f'HEAD:refs/heads/{branch}')


if __name__ == '__main__':
    try:
        main(sys.argv[1] if len(sys.argv) == 2 else '')
    except (RuntimeError, subprocess.CalledProcessError) as error:
        print(f'Aborted: {error}', file=sys.stderr)
        sys.exit(1)
