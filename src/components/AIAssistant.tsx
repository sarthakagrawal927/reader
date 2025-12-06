'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sparkles, MessageCircle, Lightbulb, FileText, Loader2 } from 'lucide-react';

interface AIAssistantProps {
  articleContent: string;
  selectedText?: string;
  onAddNote: (noteText: string) => void;
}

type AIRequestType = 'question' | 'suggest' | 'summarize';

interface AIResponse {
  answer?: string;
  suggestion?: string;
  summary?: string;
  keyPoints?: string[];
  type?: string;
  confidence?: number;
}

export default function AIAssistant({ articleContent, selectedText, onAddNote }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [requestType, setRequestType] = useState<AIRequestType>('suggest');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!articleContent.trim()) {
      setError('Article content is required');
      return;
    }

    if (requestType === 'question' && !question.trim()) {
      setError('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const requestBody: {
        content: string;
        type: AIRequestType;
        context?: string;
        question?: string;
      } = {
        content: articleContent,
        type: requestType,
      };

      if (selectedText) {
        requestBody.context = selectedText;
      }

      if (requestType === 'question') {
        requestBody.question = question;
      }

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseSuggestion = () => {
    if (response?.suggestion) {
      onAddNote(response.suggestion);
      setIsOpen(false);
      setResponse(null);
      setQuestion('');
    }
  };

  const handleAddAnswerAsNote = () => {
    if (response?.answer) {
      const noteText = `Q: ${question}\n\nA: ${response.answer}`;
      onAddNote(noteText);
      setIsOpen(false);
      setResponse(null);
      setQuestion('');
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="w-full mb-4 flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        AI Assistant
      </Button>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI Assistant
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            ×
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">What would you like to do?</label>
          <Select
            value={requestType}
            onValueChange={(value: AIRequestType) => setRequestType(value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suggest">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Suggest a comment
                </div>
              </SelectItem>
              <SelectItem value="question">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Ask a question
                </div>
              </SelectItem>
              <SelectItem value="summarize">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Summarize content
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {requestType === 'question' && (
          <div>
            <label className="block text-sm font-medium mb-2">Your question</label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about the article content..."
              rows={3}
            />
          </div>
        )}

        {selectedText && (
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
            <p className="text-sm font-medium mb-1">Selected text:</p>
            <p className="text-sm italic">
              &ldquo;{selectedText.substring(0, 100)}
              {selectedText.length > 100 ? '...' : ''}&rdquo;
            </p>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isLoading || (requestType === 'question' && !question.trim())}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Response
            </>
          )}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {response && (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
              {response.answer && (
                <div>
                  <p className="text-sm font-medium mb-2">Answer:</p>
                  <p className="text-sm whitespace-pre-line">{response.answer}</p>
                  {response.confidence && (
                    <p className="text-xs text-gray-500 mt-2">
                      Confidence: {Math.round(response.confidence * 100)}%
                    </p>
                  )}
                </div>
              )}

              {response.suggestion && (
                <div>
                  <p className="text-sm font-medium mb-2">Suggested Comment:</p>
                  <p className="text-sm italic">&ldquo;{response.suggestion}&rdquo;</p>
                  {response.type && (
                    <p className="text-xs text-gray-500 mt-2">Type: {response.type}</p>
                  )}
                </div>
              )}

              {response.summary && (
                <div>
                  <p className="text-sm font-medium mb-2">Summary:</p>
                  <p className="text-sm">{response.summary}</p>
                </div>
              )}

              {response.keyPoints && response.keyPoints.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Key Points:</p>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    {response.keyPoints.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {response.suggestion && (
                <Button onClick={handleUseSuggestion} variant="outline" size="sm">
                  Use as Note
                </Button>
              )}
              {response.answer && (
                <Button onClick={handleAddAnswerAsNote} variant="outline" size="sm">
                  Add Q&A as Note
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
