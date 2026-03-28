import { speechesData as originalSpeechesData, type Speech } from '@/data/speeches';

const SUPABASE_URL = 'https://ejeiuqcmkznfbglvbkbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqZWl1cWNta3puZmJnbHZia2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI2NjgxMTQsImV4cCI6MjA1ODI0NDExNH0.3EqqmzP5fXHF0sYVFNbVKWwLPqOYqOlK2JlFPZLf3Sk';
const ARTICLES_TABLE = 'articles';