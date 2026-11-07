import { bindRequestLocale } from '@/lib/i18n/server'
import { localizedJson } from '@/lib/i18n/localized-json'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  await bindRequestLocale()
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user?.role !== 'ADMIN' && session.user?.role !== 'MANAGER')) {
      return localizedJson({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const { emailHost, emailPort, emailSecure, emailUser, emailPassword, emailFrom } = await request.json();

    // Validation des paramètres
    if (!emailHost || !emailPort || !emailUser || !emailPassword || !emailFrom) {
      return localizedJson({ 
        error: 'Tous les champs SMTP sont requis' 
      }, { status: 400 });
    }

    // Test de connexion SMTP
    const testResult = await testSMTPConnection({
      host: emailHost,
      port: parseInt(emailPort),
      secure: emailSecure,
      user: emailUser,
      password: emailPassword,
      from: emailFrom
    });

    if (testResult.success) {
      return localizedJson({ 
        success: true, 
        message: 'Connexion SMTP réussie !',
        details: testResult.details
      });
    } else {
      return localizedJson({ 
        success: false, 
        error: testResult.error,
        details: testResult.details
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur test SMTP:', error);
    return localizedJson({ 
      error: 'Erreur lors du test de connexion SMTP' 
    }, { status: 500 });
  }
}

interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

async function testSMTPConnection(config: SMTPConfig): Promise<{
  success: boolean;
  error?: string;
  details?: string;
}> {
  try {
    // Import dynamique de nodemailer pour éviter les erreurs côté client
    const nodemailer = await import('nodemailer');
    
    // Créer un transporteur de test
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure, // true pour 465, false pour autres ports
      auth: {
        user: config.user,
        pass: config.password,
      },
      // Options de test
      connectionTimeout: 10000, // 10 secondes
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    console.log('🔍 Test de connexion SMTP:', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      from: config.from
    });

    // Tester la connexion
    await transporter.verify();
    
    console.log('✅ Connexion SMTP réussie');

    return {
      success: true,
      details: `Connexion réussie à ${config.host}:${config.port} (${config.secure ? 'SSL/TLS' : 'Non sécurisé'})`
    };

  } catch (error: unknown) {
    console.error('❌ Erreur de connexion SMTP:', error);
    
    let errorMessage = 'Erreur de connexion SMTP';
    let details = 'Détails non disponibles';

    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'ECONNREFUSED':
          errorMessage = 'Connexion refusée par le serveur SMTP';
          details = 'Vérifiez l\'adresse du serveur et le port';
          break;
        case 'ETIMEDOUT':
          errorMessage = 'Délai de connexion dépassé';
          details = 'Le serveur SMTP ne répond pas dans les temps';
          break;
        case 'EAUTH':
          errorMessage = 'Échec de l\'authentification';
          details = 'Vérifiez le nom d\'utilisateur et le mot de passe';
          break;
        case 'ENOTFOUND':
          errorMessage = 'Serveur SMTP introuvable';
          details = 'Vérifiez l\'adresse du serveur';
          break;
        default:
          errorMessage = `Erreur de connexion: ${error.code}`;
          details = ('message' in error && typeof error.message === 'string') ? error.message : 'Erreur inconnue';
      }
    } else if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      errorMessage = error.message;
      details = 'Vérifiez vos paramètres SMTP';
    }

    return {
      success: false,
      error: errorMessage,
      details
    };
  }
}
