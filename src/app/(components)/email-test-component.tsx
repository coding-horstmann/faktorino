'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react'

export function EmailTestComponent() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const handleTestEmail = async () => {
    if (!email) {
      setResult({ type: 'error', message: 'Bitte E-Mail-Adresse eingeben' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ 
          type: 'success', 
          message: `Test-E-Mail erfolgreich an ${email} gesendet!` 
        })
        setEmail('')
      } else {
        setResult({ 
          type: 'error', 
          message: data.error || 'Fehler beim Senden der E-Mail' 
        })
      }
    } catch (error) {
      setResult({ 
        type: 'error', 
        message: 'Netzwerkfehler beim Senden der E-Mail' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          E-Mail Test
        </CardTitle>
        <CardDescription>
          Teste die E-Mail-Funktionalität mit einer Test-Nachricht
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="test@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <Button 
          onClick={handleTestEmail} 
          disabled={isLoading || !email}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sende Test-E-Mail...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Test-E-Mail senden
            </>
          )}
        </Button>

        {result && (
          <Alert className={result.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {result.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={result.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {result.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Test-E-Mails enthalten Beispieldaten</p>
          <p>• Prüfe auch den Spam-Ordner</p>
          <p>• Funktioniert nur mit korrekten Brevo-Einstellungen</p>
        </div>
      </CardContent>
    </Card>
  )
}
