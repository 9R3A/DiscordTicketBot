@echo off

cd

call mode con: cols=100 lines=20

title Installing Libs...

call npm install discord.js dotenv

color 2

echo download done !

timeout /t 5

call mode con: cols=100 lines=30

color 3

title Made By 9R3A ^<3

node index.js