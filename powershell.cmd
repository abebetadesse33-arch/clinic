@echo off
set "PATH=%SystemRoot%\System32;%SystemRoot%;%SystemRoot%\System32\Wbem;%SystemRoot%\System32\WindowsPowerShell\v1.0;%ProgramFiles%\Docker\Docker\resources\bin;%ProgramFiles%\Docker\Docker\resources;%LOCALAPPDATA%\Programs\Docker\bin;%PATH%"
%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe %*
