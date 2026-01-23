import { database } from './services/database.js';

async function check() {
    try {
        await database.init();

        // Get total count
        const { count, error: countError } = await database.supabase
            .from('reports')
            .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Get oldest report date
        const { data, error: dateError } = await database.supabase
            .from('reports')
            .select('submit_date_time')
            .order('submit_date_time', { ascending: true }) // Oldest first
            .limit(1)
            .single();

        if (dateError && dateError.code !== 'PGRST116') throw dateError;

        console.log(`Current Total Reports: ${count}`);
        if (data) {
            console.log(`Oldest Data Reached: ${data.submit_date_time.substring(0, 10)}`);
        } else {
            console.log('No data found yet.');
        }
    } catch (e) {
        console.error('Error checking progress:', e);
    }
    // Exit explicitly
    process.exit(0);
}

check();
