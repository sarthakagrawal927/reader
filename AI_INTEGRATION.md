# AI Integration Feature

## Overview

Task 3 from the README has been implemented: **AI integration to add comments/ask questions**. This feature provides users with AI-powered assistance to enhance their article annotation experience.

## Features Implemented

### 1. AI Assistant Component (`src/components/AIAssistant.tsx`)

- **Location**: Integrated into the right notes panel of the Reader interface
- **Purpose**: Provides three main AI-powered functionalities

### 2. AI Functionalities

#### a) Q&A Mode

- Users can ask questions about the article content
- AI provides contextual answers based on the article text
- Selected text can be used as context for more targeted questions

#### b) Comment Suggestion Mode

- AI suggests relevant comments/annotations for the article
- Suggestions are categorized by type (analysis, insight, context)
- Selected text provides context for more relevant suggestions

#### c) Summarization Mode

- Generates article summaries
- Extracts key points from the content
- Helps users quickly grasp the main ideas

### 3. API Endpoint (`src/app/api/ai/route.ts`)

- **Endpoint**: `POST /api/ai`
- **Current State**: Mock implementation (ready for real AI service integration)
- **Request Format**:
  ```json
  {
    "content": "article content",
    "type": "question|suggest|summarize",
    "question": "user question (for Q&A mode)",
    "context": "selected text (optional)"
  }
  ```
- **Response Format**: Varies by type, includes AI-generated content

### 4. Integration with Existing System

#### Text Selection Detection

- Automatically detects when users select text in the article
- Selected text is passed as context to the AI for more relevant responses
- Enhances the contextual relevance of AI suggestions

#### Note Creation

- AI responses can be directly added as notes to the article
- Maintains the existing note structure and persistence
- Integrates seamlessly with the current annotation system

#### UI Integration

- Follows existing design patterns using shadcn components
- Responsive and accessible interface
- Consistent with the application's dark theme

## Technical Implementation

### Components Created

1. **AIAssistant.tsx** - Main AI interface component
2. **card.tsx** - Card UI component (shadcn pattern)
3. **textarea.tsx** - Textarea UI component (shadcn pattern)
4. **route.ts** - AI API endpoint

### Key Features

- **Type Safety**: Full TypeScript implementation
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Proper loading indicators during AI processing
- **Responsive Design**: Works across different screen sizes
- **Accessibility**: Proper ARIA labels and keyboard navigation

### State Management

- Uses React hooks for local state management
- Integrates with existing React Query for note persistence
- Handles text selection events efficiently

## Future Enhancements

### Production AI Integration

The current implementation uses mock AI responses. To integrate with real AI services:

1. **OpenAI Integration**:

   ```typescript
   const response = await fetch('https://api.openai.com/v1/chat/completions', {
     headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
     body: JSON.stringify({
       model: 'gpt-4',
       messages: [{ role: 'user', content: prompt }],
     }),
   });
   ```

2. **Claude Integration**:
   ```typescript
   const response = await fetch('https://api.anthropic.com/v1/messages', {
     headers: {
       'x-api-key': process.env.ANTHROPIC_API_KEY,
       'anthropic-version': '2023-06-01',
     },
     body: JSON.stringify({
       model: 'claude-3-sonnet-20240229',
       messages: [{ role: 'user', content: prompt }],
     }),
   });
   ```

### Environment Variables Needed

- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- Optional: AI model selection and configuration

## Usage Instructions

1. **Open an Article**: Navigate to the reader view for any article
2. **Access AI Assistant**: Click the "AI Assistant" button in the notes panel
3. **Select Mode**: Choose between Q&A, Suggest, or Summarize
4. **Provide Input**:
   - For Q&A: Type your question
   - For Suggest/Summarize: Optionally select text for context
5. **Generate Response**: Click "Generate Response"
6. **Use Results**: Add AI responses as notes or use them as needed

## Benefits

1. **Enhanced Productivity**: Users can quickly generate relevant annotations
2. **Better Understanding**: Q&A helps clarify complex content
3. **Contextual Insights**: AI suggestions are tailored to selected text
4. **Seamless Integration**: Works within existing annotation workflow
5. **Scalable**: Easy to extend with additional AI features

## Testing

The implementation has been tested for:

- ✅ TypeScript compilation
- ✅ ESLint compliance (with minor warnings for unused mock parameters)
- ✅ Component integration
- ✅ Error handling
- ✅ Responsive design

## Code Quality

- Follows existing code conventions and patterns
- Proper TypeScript typing throughout
- Comprehensive error handling
- Clean, maintainable code structure
- Consistent with project's architectural patterns
