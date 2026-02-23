# GPA WhatsApp Dashboard

Dashboard en tiempo real para monitorear campañas de WhatsApp Cloud API.

## Deploy en Vercel

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/TU_USUARIO/wa-dashboard.git
git push -u origin main
```

### 2. Configurar Vercel

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. Clic en **Add New Project**
3. Importa el repositorio de GitHub
4. En **Environment Variables** agrega:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vdxpmsaszntfzmmxlduf.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu Supabase anon key |

5. Clic en **Deploy**

### 3. Obtener Supabase Anon Key

En Supabase → Settings → API → `anon public` key

## Desarrollo local

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)
