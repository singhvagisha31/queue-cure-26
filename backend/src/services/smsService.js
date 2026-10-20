import dotenv from 'dotenv';
dotenv.config();

/**
 * Service to send SMS notifications using Twilio API (or a simulated logger fallback).
 */
class SmsService {
  /**
   * Sends an SMS message to a patient.
   * Uses Twilio if environment variables are provided, otherwise logs to console.
   * 
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} patientName - Patient name
   * @param {number} tokenNumber - Patient token number
   */
  async sendNotification(phoneNumber, patientName, tokenNumber) {
    if (!phoneNumber || phoneNumber.trim() === '') {
      console.log(`[SMS Service] Skipping notification for ${patientName}: No phone number provided.`);
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    const messageBody = `Hello ${patientName}, your Token #${tokenNumber} is now being called to the consulting room at St. Jude Clinic. Please proceed inside.`;

    // Check if Twilio config is available
    if (accountSid && authToken && twilioPhone) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        
        // Basic Authorization header
        const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        
        const params = new URLSearchParams();
        params.append('To', phoneNumber);
        params.append('From', twilioPhone);
        params.append('Body', messageBody);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params
        });

        const data = await response.json();
        
        if (response.ok) {
          console.log(`[SMS Service] Twilio SMS successfully sent to ${phoneNumber}. SID: ${data.sid}`);
        } else {
          console.error(`[SMS Service] Twilio API Error sending to ${phoneNumber}:`, data.message || data);
        }
      } catch (error) {
        console.error(`[SMS Service] Exception failed to send SMS to ${phoneNumber}:`, error.message);
      }
    } else {
      // Local development simulation fallback
      console.log('\n========================================================================');
      console.log('📱 [SMS SIMULATION ACTIVE] (Configure TWILIO_* env vars for real SMS)');
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: "${messageBody}"`);
      console.log('========================================================================\n');
    }
  }
}

export default new SmsService();
