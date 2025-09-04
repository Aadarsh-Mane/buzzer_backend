import axios from 'axios';
import { generateQuestionsGemini, evaluateInterviewGemini } from './gemini.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Generate interview questions using OpenAI
export async function generateQuestions(position, level, count) {
  const prompt = `
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
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a technical hiring manager creating interview questions.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content).questions;
  } catch (err) {
    console.error('OpenAI API error:', err.response?.data || err.message);
    throw new Error('Failed to generate questions');
  }
}

// Evaluate interview using OpenAI
export async function evaluateInterview(interview) {
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

  // Add questions and answers to the prompt
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
      OPENAI_API_URL,
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a technical interview evaluator.' },
          { role: 'user', content: evaluationPrompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    console.error('OpenAI evaluation error:', err.response?.data || err.message);
    throw new Error('Failed to evaluate interview');
  }
}

// Fallback wrappers: Gemini first, then OpenAI
export async function generateQuestionsWithFallback(position, level, count) {
  try {
    return await generateQuestionsGemini(position, level, count);
  } catch (err) {
    console.warn('Gemini failed, falling back to OpenAI:', err.message);
    return await generateQuestions(position, level, count);
  }
}

export async function evaluateInterviewWithFallback(interview) {
  try {
    return await evaluateInterviewGemini(interview);
  } catch (err) {
    console.warn('Gemini evaluation failed, falling back to OpenAI:', err.message);
    return await evaluateInterview(interview);
  }
}