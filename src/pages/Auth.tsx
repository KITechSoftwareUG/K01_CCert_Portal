import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, Mail, Lock, User, Smartphone, Loader2 } from 'lucide-react';
import { z } from 'zod';
const emailSchema = z.string().email('Ungültige E-Mail-Adresse');
const passwordSchema = z.string().min(6, 'Passwort muss mindestens 6 Zeichen haben');
export default function Auth() {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaSetup, setMfaSetup] = useState(false);
  const [mfaQr, setMfaQr] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  useEffect(() => {
    // Check for existing session directly without context
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session?.user) {
        navigate('/');
      }
      setCheckingSession(false);
    });

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  const validateInputs = (isSignUp: boolean) => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      if (isSignUp && !fullName.trim()) {
        throw new Error('Name ist erforderlich');
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Validierungsfehler',
          description: error.errors[0].message,
          variant: 'destructive'
        });
      } else if (error instanceof Error) {
        toast({
          title: 'Validierungsfehler',
          description: error.message,
          variant: 'destructive'
        });
      }
      return false;
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(true)) return;
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const {
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'Diese E-Mail-Adresse ist bereits registriert.';
      }
      toast({
        title: 'Registrierung fehlgeschlagen',
        description: message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Registrierung erfolgreich',
        description: 'Sie können sich jetzt anmelden.'
      });
    }
    setLoading(false);
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs(false)) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      if (error.message.includes('mfa')) {
        // MFA required
        setMfaRequired(true);
        setMfaFactorId(data?.session?.user?.factors?.[0]?.id || '');
      } else {
        toast({
          title: 'Anmeldung fehlgeschlagen',
          description: 'Ungültige Anmeldedaten. Bitte überprüfen Sie E-Mail und Passwort.',
          variant: 'destructive'
        });
      }
    }
    setLoading(false);
  };
  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      error
    } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode
    });
    if (error) {
      toast({
        title: 'MFA-Verifizierung fehlgeschlagen',
        description: 'Ungültiger Code. Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };
  const handleSetupMfa = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App'
    });
    if (error) {
      toast({
        title: 'MFA-Setup fehlgeschlagen',
        description: error.message,
        variant: 'destructive'
      });
    } else if (data) {
      setMfaQr(data.totp.qr_code);
      setMfaFactorId(data.id);
      setMfaSetup(true);
    }
    setLoading(false);
  };
  const handleVerifyMfaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const {
      error
    } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode
    });
    if (error) {
      toast({
        title: 'MFA-Verifizierung fehlgeschlagen',
        description: 'Ungültiger Code. Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'MFA aktiviert',
        description: 'Zwei-Faktor-Authentifizierung wurde erfolgreich eingerichtet.'
      });
      setMfaSetup(false);
      setMfaQr('');
      setMfaCode('');
    }
    setLoading(false);
  };
  if (mfaRequired) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
            <CardDescription>
              Geben Sie den Code aus Ihrer Authenticator-App ein
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Verifizierungscode</Label>
                <Input id="mfaCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value)} className="text-center text-2xl tracking-widest" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6}>
                {loading ? 'Wird überprüft...' : 'Verifizieren'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>;
  }
  if (mfaSetup) {
    return <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>MFA einrichten</CardTitle>
            <CardDescription>
              Scannen Sie den QR-Code mit Ihrer Authenticator-App
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mfaQr && <div className="flex justify-center">
                <img src={mfaQr} alt="MFA QR Code" className="w-48 h-48" />
              </div>}
            <form onSubmit={handleVerifyMfaSetup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setupCode">Verifizierungscode</Label>
                <Input id="setupCode" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000" value={mfaCode} onChange={e => setMfaCode(e.target.value)} className="text-center text-2xl tracking-widest" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6}>
                {loading ? 'Wird überprüft...' : 'MFA aktivieren'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => {
              setMfaSetup(false);
              setMfaQr('');
              setMfaCode('');
            }}>
                Abbrechen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>CertConsulting Pane Login </CardTitle>
          <CardDescription>
            Melden Sie sich an oder erstellen Sie ein Konto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Anmelden</TabsTrigger>
              <TabsTrigger value="register">Registrieren</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="loginEmail">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="loginEmail" type="email" placeholder="name@firma.de" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="loginPassword">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="loginPassword" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Wird angemeldet...' : 'Anmelden'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Vollständiger Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="name" type="text" placeholder="Max Mustermann" value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerEmail">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="registerEmail" type="email" placeholder="name@firma.de" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registerPassword">Passwort</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="registerPassword" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Wird registriert...' : 'Registrieren'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>;
}