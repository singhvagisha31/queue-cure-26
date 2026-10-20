import supabase from '../config/supabaseClient.js';

/**
 * Service to manage the Patient Queue database transactions using Supabase.
 */
class QueueService {
  /**
   * Adds a new patient to the queue.
   */
  async createPatient(patientName, phoneNumber) {
    const trimmedName = patientName.trim();
    const cleanPhone = phoneNumber ? phoneNumber.trim() : '';

    // 1. Check if patient already exists with status 'waiting' (case-insensitive check)
    const { data: existingPatients, error: searchError } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'waiting')
      .ilike('patientName', trimmedName);

    if (searchError) {
      throw searchError;
    }

    if (existingPatients && existingPatients.length > 0) {
      const error = new Error(`Patient "${trimmedName}" is already in the waiting queue.`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Generate sequential tokenNumber
    let tokenNumber;
    try {
      // Attempt to call PostgreSQL RPC function for next sequence value
      const { data: nextToken, error: rpcError } = await supabase.rpc('get_next_token_number');
      if (rpcError) throw rpcError;
      tokenNumber = Number(nextToken);
    } catch (err) {
      // Fallback: Find current maximum token number in the db
      const { data: maxPatient, error: maxError } = await supabase
        .from('patients')
        .select('tokenNumber')
        .order('tokenNumber', { ascending: false })
        .limit(1);

      if (maxError || !maxPatient || maxPatient.length === 0) {
        tokenNumber = 101; // First token
      } else {
        tokenNumber = Number(maxPatient[0].tokenNumber) + 1;
      }
    }

    // 3. Insert new patient record
    const { data: insertedData, error: insertError } = await supabase
      .from('patients')
      .insert([
        {
          patientName: trimmedName,
          phoneNumber: cleanPhone,
          tokenNumber: tokenNumber,
          status: 'waiting'
        }
      ])
      .select();

    if (insertError) {
      throw insertError;
    }

    return insertedData[0];
  }

  /**
   * Returns all patients sorted by token number.
   */
  async getAllPatients() {
    // Fetch all patients
    const { data: patients, error } = await supabase
      .from('patients')
      .select('*')
      .order('tokenNumber', { ascending: true });

    if (error) {
      throw error;
    }

    const settings = await this.getSettings();
    const avgTime = settings.averageConsultationTime;

    let waitingIndex = 0;
    return patients.map((patient) => {
      // Normalize _id to match MongoDB client expectation (or keep id)
      const patientObj = {
        ...patient,
        _id: patient.id // compatibility fallback for react frontend _id keys
      };
      
      if (patientObj.status === 'waiting') {
        patientObj.estimatedWaitingTime = waitingIndex * avgTime;
        waitingIndex++;
      } else {
        patientObj.estimatedWaitingTime = 0;
      }
      return patientObj;
    });
  }

  /**
   * Moves currently serving patients to completed,
   * then moves the next waiting patient to serving.
   */
  async transitionQueue() {
    // 1. Set currently serving patients to completed
    const { error: updateError } = await supabase
      .from('patients')
      .update({ status: 'completed' })
      .eq('status', 'serving');

    if (updateError) {
      throw updateError;
    }

    // 2. Fetch the next waiting patient (first-in-first-out based on token number)
    const { data: nextPatientData, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'waiting')
      .order('tokenNumber', { ascending: true })
      .limit(1);

    if (fetchError) {
      throw fetchError;
    }

    if (nextPatientData && nextPatientData.length > 0) {
      const nextPatient = nextPatientData[0];
      
      // Update next patient status to serving
      const { data: updatedPatientData, error: saveError } = await supabase
        .from('patients')
        .update({ status: 'serving', updated_at: new Date().toISOString() })
        .eq('id', nextPatient.id)
        .select();

      if (saveError) {
        throw saveError;
      }

      return updatedPatientData[0];
    }

    return null;
  }

  /**
   * Returns the currently serving patient.
   */
  async getCurrentServingPatient() {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'serving')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * Gets the global clinic settings, or initializes default ones if none exist.
   */
  async getSettings() {
    const { data: settingsData, error } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('id', 1)
      .limit(1);

    if (error) {
      // If error occurs (like table doesn't exist), return default fallback
      return { averageConsultationTime: 15 };
    }

    if (!settingsData || settingsData.length === 0) {
      // Create settings record
      const { data: newSettings, error: insertError } = await supabase
        .from('clinic_settings')
        .insert([{ id: 1, averageConsultationTime: 15 }])
        .select();
        
      if (insertError) {
        return { averageConsultationTime: 15 };
      }
      return newSettings[0];
    }

    return settingsData[0];
  }

  /**
   * Updates or inserts (upserts) the global clinic settings.
   */
  async upsertSettings(averageConsultationTime) {
    const { data, error } = await supabase
      .from('clinic_settings')
      .upsert({ id: 1, averageConsultationTime })
      .select();

    if (error) {
      throw error;
    }

    return data[0];
  }
}

export default new QueueService();
