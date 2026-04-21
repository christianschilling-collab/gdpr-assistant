# 📧 E-Mail-Versand Setup

Die Training-E-Mail-Funktion ist vorbereitet, benötigt aber noch die Konfiguration eines E-Mail-Services.

## Aktueller Status

✅ **UI fertig**: Training-Versand-Seite ist vollständig implementiert  
✅ **API Route vorhanden**: `/api/training/send` ist bereit  
⚠️ **E-Mail-Service**: Noch nicht konfiguriert (aktuell nur Logging)

## E-Mail-Service Optionen

### Option 1: Resend (Empfohlen) ⭐

**Warum**: Modern, einfach, gute Developer Experience

1. **Account erstellen**: https://resend.com
2. **API Key holen**: Dashboard → API Keys → Create API Key
3. **Package installieren**:
   ```bash
   npm install resend
   ```
4. **Environment Variable hinzufügen** (`.env.local`):
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
5. **Code aktualisieren** in `app/api/training/send/route.ts`:
   ```typescript
   import { Resend } from 'resend';
   
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   await resend.emails.send({
     from: 'GDPR Training <training@yourdomain.com>',
     to: agentEmail,
     subject: emailSubject,
     html: emailBody.replace(/\n/g, '<br>'),
   });
   ```

### Option 2: SendGrid

1. **Account erstellen**: https://sendgrid.com
2. **API Key erstellen**: Settings → API Keys
3. **Package installieren**:
   ```bash
   npm install @sendgrid/mail
   ```
4. **Environment Variable**:
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   ```
5. **Code aktualisieren**:
   ```typescript
   import sgMail from '@sendgrid/mail';
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
   
   await sgMail.send({
     to: agentEmail,
     from: 'training@yourdomain.com',
     subject: emailSubject,
     html: emailBody.replace(/\n/g, '<br>'),
   });
   ```

### Option 3: Nodemailer (SMTP)

Für interne E-Mail-Server oder Office 365/Exchange:

1. **Package installieren**:
   ```bash
   npm install nodemailer
   ```
2. **Environment Variables**:
   ```env
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=your-email@company.com
   SMTP_PASS=your-password
   ```
3. **Code aktualisieren**:
   ```typescript
   import nodemailer from 'nodemailer';
   
   const transporter = nodemailer.createTransport({
     host: process.env.SMTP_HOST,
     port: parseInt(process.env.SMTP_PORT || '587'),
     secure: false,
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS,
     },
   });
   
   await transporter.sendMail({
     from: process.env.SMTP_USER,
     to: agentEmail,
     subject: emailSubject,
     text: emailBody,
     html: emailBody.replace(/\n/g, '<br>'),
   });
   ```

### Option 4: Company E-Mail Service

Falls dein Unternehmen einen eigenen E-Mail-Service hat, passe den Code entsprechend an.

## Aktuelle Implementierung

Aktuell wird die E-Mail nur geloggt (siehe Console). Um echte E-Mails zu versenden:

1. Wähle einen E-Mail-Service (Resend empfohlen)
2. Installiere das entsprechende Package
3. Füge API Keys zu `.env.local` hinzu
4. Aktualisiere `app/api/training/send/route.ts` mit dem E-Mail-Sending-Code

## E-Mail-Template

Das aktuelle Template ist einfach gehalten. Du kannst es in `buildEmailBody()` in `route.ts` anpassen, um:
- HTML-Formatierung hinzuzufügen
- Company Branding einzubauen
- Links besser zu formatieren
- etc.

## Testing

Nach der Konfiguration kannst du testen:
1. Gehe zu `/training/send`
2. Gib eine Test-E-Mail-Adresse ein
3. Wähle Kategorien aus
4. Klicke "Send Training Email"
5. Prüfe, ob die E-Mail ankommt

---

**Brauchst du Hilfe bei der Einrichtung?** Sag Bescheid, welchen Service du verwenden möchtest! 🚀
