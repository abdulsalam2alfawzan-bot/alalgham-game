# الألغام

لعبة عربية سريعة للفرق تعمل بواجهة RTL. هذا الـ MVP مهيأ للنشر على Firebase Hosting classic كـ static export، مع Firebase client SDK فقط وبيانات mock/local عند غياب إعدادات Firebase.

## البنية

- Next.js App Router + TypeScript.
- Firebase Hosting classic عبر static export إلى مجلد `out`.
- Firebase client SDK فقط.
- Firebase Anonymous Auth يعمل بصمت في الخلفية عند توفر إعدادات Firebase.
- Cloud Firestore عند توفر الإعدادات.
- fallback محلي عبر `localStorage` إذا لم تكن Firebase مهيأة.

## نموذج الوصول للغرف

الغرف تكون مجهزة مسبقًا. العميل يستلم كود مالك الغرفة لإدارة جلسته، واللاعبون يستلمون كود اللاعبين للانضمام للغرفة نفسها.

- `كود مالك الغرفة`: خاص بالمشرف فقط، ويفتح `/owner` ثم غرفة المشرف.
- `كود اللاعبين`: مخصص للاعبين فقط، ويفتح `/join`.

أمثلة mock محلية:

```text
room-4821
كود مالك الغرفة: M-4821-93
كود اللاعبين: P-4821-27

room-2026
كود مالك الغرفة: M-2026-55
كود اللاعبين: P-2026-88
```

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

## قيود مهمة

- لا API routes.
- لا Server Actions.
- لا Middleware.
- لا SSR.
- لا backend server code.
- لا تسجيل دخول مرئي.
- لا دفع الآن.
- كود مالك الغرفة خاص بالمشرف ولا يشارك مع اللاعبين.
- كود اللاعبين وQR الدعوة مخصصان للاعبين فقط.
- التحقق من الصلاحيات في هذا الـ MVP يتم في الواجهة وقواعد Firestore مبدئية؛ الإنتاج يحتاج قواعد أقوى أو منطق موثوق لتطبيق الصلاحيات بالكامل.
