import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendVerificationEmail(email, username, token) {
    if (!resend) {
        console.warn('RESEND_API_KEY not set - email features disabled');
        return { success: false, error: 'Email service not configured' };
    }

    const verificationUrl = `https://hierotranslate.com/verify-email?token=${token}`;

    try {
        const { data, error } = await resend.emails.send({
            from: 'Hierotranslate <noreply@hierotranslate.com>',
            to: email,
            subject: 'Bienvenue sur Hierotranslate ! 𓂀 Vérifiez votre email',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header .hieroglyph { font-size: 48px; margin-bottom: 10px; }
            .content { padding: 40px 30px; }
            .content h2 { color: #1e3a5f; margin-top: 0; }
            .content p { color: #555; line-height: 1.6; }
            .button { display: inline-block; background: linear-gradient(135deg, #c9a227 0%, #d4af37 100%); color: #1e3a5f !important; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; color: #888; font-size: 12px; }
            .features { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .features li { color: #555; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="hieroglyph">𓂀</div>
              <h1>Bienvenue sur Hierotranslate !</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${username} 👋</h2>
              <p>Merci de rejoindre la communauté Hierotranslate ! Vous êtes maintenant prêt à explorer le monde fascinant de l'égyptien ancien.</p>
              
              <p>Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Vérifier mon email</a>
              </div>
              
              <div class="features">
                <p><strong>Avec votre compte, vous pourrez :</strong></p>
                <ul>
                  <li>🔍 Sauvegarder vos recherches favorites</li>
                  <li>📚 Accéder à votre historique de recherche</li>
                  <li>🏆 Participer aux exercices et suivre votre progression</li>
                  <li>💬 Échanger avec la communauté d'égyptologues</li>
                </ul>
              </div>
              
              <p style="color: #888; font-size: 12px;">Si vous n'avez pas créé de compte sur Hierotranslate, ignorez simplement cet email.</p>
            </div>
            <div class="footer">
              <p>© 2024 Hierotranslate — Dictionnaire de l'Égyptien Ancien</p>
              <p>Créé par Jules Charcosset</p>
            </div>
          </div>
        </body>
        </html>
      `
        });

        if (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}
