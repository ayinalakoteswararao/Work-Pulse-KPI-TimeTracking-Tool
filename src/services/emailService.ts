// Email notification service for Team Pulse
// This is a placeholder implementation that logs to console
// In production, replace with actual email service integration

export interface LoginNotificationData {
  email: string;
  userName: string;
  timestamp: string;
  loginType?: 'employee' | 'admin';
}

export const sendLoginNotificationEmail = async (data: LoginNotificationData) => {
  try {
    // Log the notification (placeholder for actual email sending)
    console.log('📧 LOGIN NOTIFICATION:', {
      to: data.email,
      subject: 'Team Pulse - Login Notification',
      user: data.userName,
      time: data.timestamp,
      type: data.loginType || 'user'
    });

    // In production, you would implement one of these options:
    
    // Option 1: Supabase Edge Function
    // const { data, error } = await supabase.functions.invoke('send-login-email', {
    //   body: {
    //     to: data.email,
    //     subject: 'Team Pulse - Login Notification',
    //     template: 'login-notification',
    //     data: {
    //       userName: data.userName,
    //       loginTime: data.timestamp,
    //       loginType: data.loginType
    //     }
    //   }
    // });

    // Option 2: Direct API call to email service
    // const response = await fetch('/api/send-login-notification', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });

    // Option 3: Third-party email service (SendGrid, AWS SES, etc.)
    // await sendgrid.send({
    //   to: data.email,
    //   from: 'noreply@teampulse.com',
    //   subject: 'Team Pulse - Login Notification',
    //   templateId: 'login-notification-template',
    //   dynamicTemplateData: {
    //     userName: data.userName,
    //     loginTime: new Date(data.timestamp).toLocaleString()
    //   }
    // });

    return { success: true, message: 'Login notification logged successfully' };
  } catch (error) {
    console.error('Failed to send login notification:', error);
    throw new Error('Failed to send login notification email');
  }
};

// Email template for login notifications
export const getLoginNotificationTemplate = (data: LoginNotificationData) => {
  return {
    subject: 'Team Pulse - Login Notification',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Team Pulse Login Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Team Pulse</h1>
            <h2>Login Notification</h2>
          </div>
          <div class="content">
            <p>Hello <strong>${data.userName}</strong>,</p>
            <p>This is to notify you that your Team Pulse account was accessed on:</p>
            <p><strong>${new Date(data.timestamp).toLocaleString()}</strong></p>
            <p>If this was you, no action is needed. If you didn't log in at this time, please contact your administrator immediately.</p>
            <p>Thank you,<br>Team Pulse Security Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};
