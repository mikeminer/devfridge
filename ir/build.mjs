import { mkdir, copyFile, writeFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
for (const file of ['index.html','style.css','app.js','i18n.mjs']) await copyFile(file, 'dist/'+file);
await writeFile('dist/robots.txt','User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://ir.devfridge.cool/sitemap.xml\n');
await writeFile('dist/sitemap.xml','<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://ir.devfridge.cool/</loc></url></urlset>');
console.log('Built DevFridge IR chat.');
