@echo off
rem 双击启动本地服务器，然后打开浏览器访问：
rem   http://localhost:8000/01-camera/
rem 切换课程就改地址里的文件夹名（02-hand-landmarks 等）

cd /d "%~dp0"
echo 启动本地服务器... 请不要关闭这个窗口。
echo 打开浏览器访问: http://localhost:8000/01-camera/
start "" "http://localhost:8000/01-camera/"
npx --yes serve -l 8000 .
pause
