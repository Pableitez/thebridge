#!/bin/bash
cd "$(dirname "$0")"
export GIT_PAGER=cat
git add -A
git commit -m "Update modal titles to match Data Comparison style (no bold) and fix date filter counts in all hubs"
git push origin main


