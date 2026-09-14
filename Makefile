.PHONY: init update sync test check

PYTHON ?= python3

init:
	$(PYTHON) scripts/team.py init

test:
	npm test

check: test
	$(PYTHON) -m unittest discover -s docs/global-wiki/tests -v
	$(PYTHON) docs/global-wiki/scripts/wiki_checker.py
	$(PYTHON) scripts/documentation_guard.py

update:
	$(PYTHON) scripts/team.py update

sync:
	$(PYTHON) scripts/team.py sync
