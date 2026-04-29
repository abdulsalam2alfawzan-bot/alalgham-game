# الألغام

لعبة عربية سريعة للفرق تعمل بواجهة RTL، وتركز على إنشاء غرفة، دعوة اللاعبين، تجهيز اللوحات، ثم إدارة اللعب والنقاط.

## البنية

- Next.js App Router + TypeScript.
- Firebase Hosting classic عبر static export إلى مجلد `out`.
- Firebase client SDK فقط.
- Firebase Anonymous Auth يعمل بصمت في الخلفية عند توفر إعدادات Firebase.
- Cloud Firestore عند توفر الإعدادات.
- fallback محلي عبر `localStorage` إذا لم تكن Firebase مهيأة.

## خدمات Firebase المطلوبة

فعّل هذه الخدمات في مشروع Firebase:

1. Authentication → Anonymous.
2. Firestore Database.
3. Firebase Hosting classic.

مهم: لا تستخدم Firebase App Hosting لهذا الـ MVP.

## متغيرات البيئة

انسخ `.env.example` إلى `.env.local` ثم املأ القيم من Firebase Console:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_APP_URL=
```

لا تضع أسرارًا خاصة في هذه القيم. كلها مفاتيح public مخصصة لاستخدام Firebase client SDK.

## أوامر التطوير

```powershell
cd C:\Projects\alalgham-game
npm.cmd run dev
```

افتح:

```text
http://localhost:3000
```

## البناء

```powershell
cd C:\Projects\alalgham-game
npm.cmd run build
```

ينتج البناء مجلد:

```text
out
```

## النشر على Firebase Hosting classic

```powershell
cd C:\Projects\alalgham-game
npm.cmd run build
firebase.cmd deploy --only hosting
```

يمكن أيضًا تشغيل:

```powershell
.\deploy.cmd
```

## حفظ التغييرات في GitHub

```powershell
cd C:\Projects\alalgham-game
git add .
git commit -m "Implement Firebase MVP for Alalgham"
git push
```

## أكواد التفعيل التجريبية

```text
JWK-4821
JWK-2026
DEMO-1234
```

## قيود مهمة

- لا API routes.
- لا Server Actions.
- لا Middleware.
- لا SSR.
- لا backend server code.
- لا تسجيل دخول مرئي.
- لا دفع الآن.
- إنشاء غرفة يمر عبر كود تفعيل أو خيار QR تفعيل.
- رمز الغرفة وQR الدعوة مخصصان للاعبين فقط.
