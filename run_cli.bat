@echo off
chcp 65001 >nul

echo Building...
call npx tsc --noEmit false 2>nul || tsc
echo Running FIFA CLI...
node dist/cli.js

if exist set_prompt.bat (
    call set_prompt.bat
    del set_prompt.bat
)
