import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import fs from 'fs';

export async function jwtAuthts(config: any, projectDir: any) {
    const packageJsonPath = join(projectDir, 'backend','package.json');
    const jsonData = await JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    jsonData.dependencies = jsonData.dependencies || {};
    jsonData.dependencies["jsonwebtoken"] = "^9.0.2";

    fs.writeFileSync(packageJsonPath, JSON.stringify(jsonData, null, 2), 'utf8');

    const jwtAuthFile = `
    const jwt = require('jsonwebtoken');

export const authenticateToken = (req:any, res:any, next:any) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access Denied' });

    jwt.verify(token, process.env.JWT_SECRET, (err:any, user) => {
        if (err) return res.status(403).json({ error: 'Invalid Token' });
        req.user = user;
        next();
    });
};
`;

    const middlewareDir = join(projectDir, 'backend', 'src', 'middleware');
    await mkdir(middlewareDir, { recursive: true });

    await writeFile(join(middlewareDir, 'middleware.ts'), jwtAuthFile, 'utf8');
}

export async function jwtAuthdjango(config: any, projectDir: any) {
    const settingsPath = join(projectDir, 'backend', 'core', 'settings.py');
    
    try {
        let settingsContent = fs.readFileSync(settingsPath, 'utf8');
        
        const restFrameworkSettings = `

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
}
`;
        
        const installedAppsIndex = settingsContent.indexOf('INSTALLED_APPS');
        const insertPosition = settingsContent.indexOf(']', installedAppsIndex) + 1;
        
        settingsContent = 
            settingsContent.slice(0, insertPosition) + 
            restFrameworkSettings + 
            settingsContent.slice(insertPosition);
        
        fs.writeFileSync(settingsPath, settingsContent, 'utf8');
        let urlsContent = fs.readFileSync(`${projectDir}/backend/core/urls.py`, 'utf8');
        const newUrlsContent = `from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt import views as jwt_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', 
         jwt_views.TokenObtainPairView.as_view(), 
         name='token_obtain_pair'),
    path('api/token/refresh/', 
         jwt_views.TokenRefreshView.as_view(), 
         name='token_refresh'),
    path('', include('main.urls')),
]
`;
        fs.writeFileSync(`${projectDir}/backend/core/urls.py`, newUrlsContent, 'utf8');

    } catch (error) {
        console.error('Error configuring Django settings:', error);
        throw error;
    }
}




