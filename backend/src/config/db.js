import supabase from './supabaseClient.js';
import crypto from 'crypto';

// Hash function matching the original User model's PBKDF2 logic
const hashPassword = (password) => {
  const salt = 'salt_queue_cure_26';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
};

const connectDB = async () => {
  try {
    // 1. Verify connection by querying settings
    console.log('[Supabase] Verifying connection...');
    
    const { data: settingsData, error: settingsError } = await supabase
      .from('clinic_settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      // Check if table does not exist
      if (settingsError.code === 'PGRST116' || settingsError.message.includes('does not exist')) {
        console.warn('[Supabase] WARNING: Tables may not exist yet. Please run the SQL setup script in your Supabase SQL Editor.');
        return;
      }
      throw settingsError;
    }

    console.log('[Supabase] Connection verified successfully.');

    // 2. Initialize default clinic settings row if missing
    if (!settingsData || settingsData.length === 0) {
      const { error: insertError } = await supabase
        .from('clinic_settings')
        .insert([{ id: 1, averageConsultationTime: 15 }]);
        
      if (insertError) {
        console.error('[Supabase] Failed to initialize default settings:', insertError.message);
      } else {
        console.log('[Supabase] Default settings initialized (averageConsultationTime: 15).');
      }
    }

    // 3. Seed default receptionist user if none exist
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'receptionist')
      .limit(1);

    if (usersError) {
      console.error('[Supabase] Failed to check for receptionist user:', usersError.message);
      return;
    }

    if (!usersData || usersData.length === 0) {
      const hashedPassword = hashPassword('admin123');
      const { error: seedError } = await supabase
        .from('users')
        .insert([
          {
            username: 'receptionist',
            email: 'receptionist@stjude.com',
            password: hashedPassword,
            role: 'receptionist'
          }
        ]);

      if (seedError) {
        console.error('[Supabase] Failed to seed default receptionist user:', seedError.message);
      } else {
        console.log('[Supabase] Default receptionist user seeded (username: receptionist, password: admin123).');
      }
    }
  } catch (error) {
    console.error(`[Supabase] Initialization Error: ${error.message}`);
  }
};

export default connectDB;
