import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getCharacters = async () => {
  try {
    const response = await api.get('/characters');
    return response.data.characters;
  } catch (error) {
    console.error('Error fetching characters:', error);
    throw error;
  }
};

export const startDebate = async (topic: string, characterNames: string[]) => {
  try {
    const response = await api.post('/debate/start', { topic, character_names: characterNames });
    return response.data.debate_id;
  } catch (error) {
    console.error('Error starting debate:', error);
    throw error;
  }
};

export const speak = async (debateId: string, characterName: string, statement: string) => {
  try {
    const response = await api.post(`/debate/${debateId}/speak`, { character_name: characterName, statement });
    return response.data;
  } catch (error) {
    console.error('Error sending statement:', error);
    throw error;
  }
};

export const getDebateStatus = async (debateId: string) => {
  try {
    const response = await api.get(`/debate/${debateId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching debate status:', error);
    throw error;
  }
};
