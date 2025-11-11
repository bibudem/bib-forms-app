import { config } from '../config.local';

export const environment = {
  production: true,
  supabase: {
    url: config.supabaseUrl,
    anonKey: config.supabaseKey
  },
  apiUrl: config.apiUrlProd
};
