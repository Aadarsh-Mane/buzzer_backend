import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use gemini-2.0-flash-exp model (Gemini 2.5 Flash)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

// Generate interview questions using Gemini
export async function generateQuestionsGemini(position, level, count) {
  const prompt = `
    For each question, you must provide a detailed model answer (sample answer) that would be considered excellent in a real interview. Do not skip the model answer.
    Generate ${count} technical interview questions for a ${position} position at ${level} difficulty level.
    For each question, include:
    - The question text
    - 3-5 keywords that should appear in a good answer
    - A brief ideal answer (1-2 sentences)
    
    Return in JSON format: 
    {
      "questions": [
        {
          "text": "Question text",
          "keywords": ["kw1", "kw2"],
          "idealAnswer": "Ideal answer text"
        }
      ]
    }
  `;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    // Gemini returns candidates[0].content.parts[0].text
    let content = response.data.candidates[0].content.parts[0].text;
    // Remove markdown code block if present
    content = content.replace(/```json|```/g, '').trim();
    return JSON.parse(content).questions;
  } catch (err) {
    if (err.response?.data?.error?.message?.includes('not found')) {
      console.error('Gemini API error: Model not found or not available to your API key. Please check your Gemini API key and project permissions.');
    } else {
      console.error('Gemini API error:', err.response?.data || err.message);
    }
    throw new Error('Failed to generate questions with Gemini');
  }
}

// Evaluate interview using Gemini
export async function evaluateInterviewGemini(interview) {
  let evaluationPrompt = `
    You are an expert technical interviewer. Evaluate the following interview session:
    Position: ${interview.position}
    Difficulty: ${interview.level}
    
    Evaluate each answer based on:
    - Technical accuracy
    - Completeness
    - Relevance to question
    - Communication clarity
    
    Score each answer from 1-10 (10 being excellent) and provide brief feedback.
    Finally, give an overall score (0-100%) and overall feedback.
    
    Return in JSON format:
    {
      "overallScore": 85,
      "overallFeedback": "Overall feedback text",
      "questionFeedback": [
        {
          "score": 8,
          "feedback": "Feedback for question 1"
        }
      ]
    }
    
    Questions and Answers:
  `;

  interview.questions.forEach((q, i) => {
    const answer = interview.answers[i]?.answerText || 'No answer provided';
    evaluationPrompt += `
      Question ${i+1}: ${q.text}
      Ideal Answer: ${q.idealAnswer}
      Candidate Answer: ${answer}
      ---
    `;
  });

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          { role: 'user', parts: [{ text: evaluationPrompt }] }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    let content = response.data.candidates[0].content.parts[0].text;
    // Remove markdown code block if present
    content = content.replace(/```json|```/g, '').trim();
    return JSON.parse(content);
  } catch (err) {
    if (err.response?.data?.error?.message?.includes('not found')) {
      console.error('Gemini API error: Model not found or not available to your API key. Please check your Gemini API key and project permissions.');
    } else {
      console.error('Gemini evaluation error:', err.response?.data || err.message);
    }
    throw new Error('Failed to evaluate interview with Gemini');
  }
} 