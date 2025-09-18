Intel Summit Check-In Demo
===========================

This is a small demo project that implements the interactive check-in system
requested by Intel. It includes:

- index.html : the demo UI
- style.css  : styling
- script.js  : the interactive JavaScript (attendance, team counts, progress, celebration)
- intel-summit.png : banner image (from the uploaded assets)

How to use
----------
1. Unzip the package and open `index.html` in your browser (or serve via a simple static server).
2. Fill in a name and select a team, then click 'Check In'.
3. The attendance counter, team counts and the progress bar will update.
4. When the attendance reaches 50, a celebration message appears and the leading team(s) are highlighted.

Push to GitHub
--------------
To push this demo to your repository:

```
git init
git add .
git commit -m "Add Intel summit check-in demo"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Customization
-------------
- Change the attendance goal by editing `const MAX_COUNT = 50;` in `script.js`.
- Replace or adjust HTML ids if your existing project uses different names.

