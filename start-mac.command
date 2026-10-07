#!/bin/bash
# 双击启动本地服务器（需要在 终端 里先执行一次: chmod +x start-mac.command）
# 然后打开浏览器访问: http://localhost:8000/01-camera/

cd "$(dirname "$0")"
echo "启动本地服务器... 请不要关闭这个窗口。"
echo "打开浏览器访问: http://localhost:8000/01-camera/"
(sleep 2 && open "http://localhost:8000/01-camera/") &
npx --yes serve -l 8000 .
