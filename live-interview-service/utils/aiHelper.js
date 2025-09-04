import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class AIHelper {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.geminiModel = this.gemini.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  // Generate interview questions based on job description and resume
  async generateQuestions(jobDescription, resume, interviewType = 'mixed', count = 10) {
    try {
      const prompt = `
        Generate ${count} interview questions for a ${interviewType} interview.
        
        Job Description: ${jobDescription}
        Candidate Resume: ${resume}
        
        Generate a mix of:
        - Technical questions (if applicable)
        - Behavioral questions
        - Problem-solving scenarios
        - Role-specific questions
        
        Format each question with:
        - Question text
        - Category (technical/behavioral/general)
        - Difficulty (easy/medium/hard)
        - Expected key points in answer
        
        Return as JSON array with structure:
        [
          {
            "question": "Question text",
            "category": "technical|behavioral|general",
            "difficulty": "easy|medium|hard",
            "expectedPoints": ["point1", "point2"]
          }
        ]
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.getFallbackQuestions(interviewType, count);
    }
  }

  // Provide real-time AI assistance for candidate responses using Gemini 2.5 Flash
  async provideAssistance(question, candidateAnswer, jobDescription, context = '') {
    try {
      const prompt = `
        Analyze this interview response and provide assistance:
        
        Question: ${question}
        Candidate's Answer: ${candidateAnswer}
        Job Description: ${jobDescription}
        Context: ${context}
        
        Provide:
        1. A better answer suggestion
        2. Key points that should be mentioned
        3. Confidence score (0-1) for the current answer
        4. Areas for improvement
        
        Return as JSON:
        {
          "suggestion": "Improved answer",
          "keyPoints": ["point1", "point2"],
          "confidence": 0.7,
          "improvements": ["area1", "area2"],
          "score": 7
        }
      `;

      const result = await this.geminiModel.generateContent(prompt);
      const response = await result.response;
      const content = response.text();
      return JSON.parse(content);
    } catch (error) {
      console.error('Error providing AI assistance with Gemini:', error);
      return {
        suggestion: "Unable to generate suggestion at this time.",
        keyPoints: [],
        confidence: 0.5,
        improvements: ["Consider providing more specific examples"],
        score: 5
      };
    }
  }

  // Analyze interview performance and provide feedback
  async analyzePerformance(questions, responses, jobDescription) {
    try {
      const prompt = `
        Analyze this interview performance:
        
        Questions and Responses:
        ${questions.map((q, i) => `${i + 1}. Q: ${q.question}\nA: ${responses[i] || 'No response'}`).join('\n')}
        
        Job Description: ${jobDescription}
        
        Provide:
        1. Overall assessment
        2. Strengths
        3. Areas for improvement
        4. Overall score (1-10)
        5. Recommendation (pass/fail/consider)
        
        Return as JSON:
        {
          "assessment": "Overall assessment",
          "strengths": ["strength1", "strength2"],
          "weaknesses": ["weakness1", "weakness2"],
          "score": 7,
          "recommendation": "pass|fail|consider",
          "detailedFeedback": "Detailed feedback"
        }
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing performance:', error);
      return {
        assessment: "Unable to analyze performance at this time.",
        strengths: [],
        weaknesses: ["Unable to analyze"],
        score: 5,
        recommendation: "consider",
        detailedFeedback: "Analysis unavailable"
      };
    }
  }

  // Generate follow-up questions based on previous responses
  async generateFollowUpQuestions(previousQuestion, candidateAnswer, jobDescription) {
    try {
      const prompt = `
        Based on this response, generate 2-3 follow-up questions:
        
        Original Question: ${previousQuestion}
        Candidate's Answer: ${candidateAnswer}
        Job Description: ${jobDescription}
        
        Generate follow-up questions that:
        1. Probe deeper into the candidate's experience
        2. Challenge their assumptions
        3. Explore specific examples
        4. Test technical knowledge (if applicable)
        
        Return as JSON array:
        [
          {
            "question": "Follow-up question",
            "category": "technical|behavioral|general",
            "difficulty": "easy|medium|hard"
          }
        ]
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating follow-up questions:', error);
      return [];
    }
  }

  // Fallback questions if AI fails
  getFallbackQuestions(interviewType, count) {
    const questions = {
      technical: [
        {
          question: "Explain the difference between REST and GraphQL APIs.",
          category: "technical",
          difficulty: "medium",
          expectedPoints: ["REST is resource-based", "GraphQL is query-based", "Performance differences"]
        },
        {
          question: "How would you optimize a slow database query?",
          category: "technical",
          difficulty: "medium",
          expectedPoints: ["Indexing", "Query optimization", "Database design"]
        }
      ],
      behavioral: [
        {
          question: "Tell me about a time you had to resolve a conflict with a team member.",
          category: "behavioral",
          difficulty: "medium",
          expectedPoints: ["Situation description", "Actions taken", "Results achieved"]
        },
        {
          question: "How do you handle tight deadlines and pressure?",
          category: "behavioral",
          difficulty: "easy",
          expectedPoints: ["Time management", "Prioritization", "Stress handling"]
        }
      ],
      general: [
        {
          question: "Why are you interested in this position?",
          category: "general",
          difficulty: "easy",
          expectedPoints: ["Company interest", "Role alignment", "Career goals"]
        },
        {
          question: "Where do you see yourself in 5 years?",
          category: "general",
          difficulty: "easy",
          expectedPoints: ["Career progression", "Skill development", "Goals"]
        }
      ]
    };

    const allQuestions = [
      ...questions.technical,
      ...questions.behavioral,
      ...questions.general
    ];

    return allQuestions.slice(0, count);
  }
}

export default new AIHelper(); 