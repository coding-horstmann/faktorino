'use client';

import { Button } from "@/components/ui/button";
import { Check, Download, FileUp, GanttChartSquare, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const TrustIcon = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex flex-col items-center text-center gap-2">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
            {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
    </div>
);

const Step = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex flex-col items-center text-center p-6 bg-secondary rounded-xl shadow-sm">
        <div className="mb-4 text-primary">
            {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
    </div>
);

const PricingCard = ({ 
    title, 
    subtitle, 
    price, 
    billing, 
    features, 
    isPopular = false 
}: { 
    title: string, 
    subtitle: string, 
    price: string, 
    billing: string, 
    features: string[], 
    isPopular?: boolean 
}) => (
    <Card className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}>
        {isPopular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Beliebt
                </span>
            </div>
        )}
        <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <p className="text-muted-foreground">{subtitle}</p>
        </CardHeader>
        <CardContent className="text-center">
            <div className="mb-6">
                <div className="text-4xl font-bold mb-2">{price}</div>
                <p className="text-sm text-muted-foreground">{billing}</p>
            </div>
            <div className="space-y-3 mb-8">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                    </div>
                ))}
            </div>
            <Button asChild className="w-full" size="lg">
                <Link href="/register">
                    Kostenlos testen
                    <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
            </Button>
        </CardContent>
    </Card>
);


export default function Home() {

  return (
    <div className="w-full">
        {/* Hero Section */}
        <section className="text-center py-20">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-black mb-4 font-headline">
                Etsy Rechnungen automatisch erstellen – schnell & einfach mit <span className="text-primary">faktorino</span>
            </h1>
            <p className="text-lg md:text-xl text-black mb-8 max-w-2xl mx-auto">
                Spare wertvolle Zeit und erstelle mit wenigen Klicks professionelle und korrekte Rechnungen für alle deine Etsy-Verkäufe.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                    <Link href="/register">Jetzt 14 Tage kostenlos testen</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/login">Bereits Kunde? Anmelden</Link>
                </Button>
            </div>
        </section>

        {/* Trust Icons Section */}
        <section className="py-12 bg-secondary rounded-lg">
            <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                <TrustIcon
                    icon={<Check className="w-6 h-6" />}
                    title="DSGVO-konform"
                    description="Sichere Verarbeitung deiner Daten auf deutschen Servern."
                />
                <TrustIcon
                    icon={<Check className="w-6 h-6" />}
                    title="Transparent & Fair"
                    description="Nach 14 Tagen nur 4,99 €/Monat. Jederzeit kündbar."
                />
                 <TrustIcon
                    icon={<Check className="w-6 h-6" />}
                    title="Flexibel für dein Business"
                    description="Rechnungen mit oder ohne USt. (Kleinunternehmer)."
                />
            </div>
        </section>

        {/* Step-by-Step Section */}
        <section className="py-20">
            <div className="container mx-auto text-center">
                <h2 className="text-3xl font-bold mb-10 text-black">In 3 einfachen Schritten zur fertigen Rechnung</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <Step 
                        icon={<GanttChartSquare size={48} />}
                        title="1. Daten eingeben"
                        description="Gib einmalig deine Firmendaten ein, die auf den Rechnungen erscheinen sollen."
                   />
                    <Step 
                        icon={<Download size={48} />}
                        title="2. CSV hochladen"
                        description="Lade die Bestell-CSV von Etsy herunter und ziehe sie per Drag & Drop in unser Tool."
                   />
                    <Step 
                        icon={<FileUp size={48} />}
                        title="3. Rechnungen erhalten"
                        description="Das Tool generiert automatisch alle Rechnungen, die du als PDF herunterladen kannst."
                   />
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-secondary rounded-lg">
            <div className="container mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4 text-black">Wähle dein perfektes Credit-Paket</h2>
                    <p className="text-lg text-black max-w-2xl mx-auto">
                        Kaufe Credits für deine Rechnungen. Je mehr Credits du kaufst, desto günstiger wird es pro Rechnung.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    <PricingCard
                        title="Starter Paket"
                        subtitle="Für Einsteiger"
                        price="7,99 €"
                        billing="500 Credits • ~0,0160€ pro Credit"
                        features={[
                            "500 Credits für Rechnungen",
                            "Grundlegende Rechnungsvorlagen",
                            "E-Mail Support",
                            "Standard-Export-Formate",
                            "Einmalzahlung - keine Abo"
                        ]}
                    />
                    <PricingCard
                        title="Professional Paket"
                        subtitle="Für aktive Shops"
                        price="9,99 €"
                        billing="1.000 Credits • ~0,0100€ pro Credit"
                        features={[
                            "1.000 Credits für Rechnungen",
                            "Erweiterte Rechnungsvorlagen",
                            "Prioritäts-Support",
                            "Alle Export-Formate",
                            "Automatische Backup-Funktion",
                            "Einmalzahlung - keine Abo"
                        ]}
                        isPopular={true}
                    />
                    <PricingCard
                        title="Business Paket"
                        subtitle="Für große Shops"
                        price="19,99 €"
                        billing="3.000 Credits • ~0,0067€ pro Credit"
                        features={[
                            "3.000 Credits für Rechnungen",
                            "Alle Rechnungsvorlagen",
                            "24/7 Premium Support",
                            "API-Zugang",
                            "Erweiterte Analytics",
                            "Individuelle Anpassungen",
                            "Einmalzahlung - keine Abo"
                        ]}
                    />
                </div>
            </div>
        </section>
        
        {/* FAQ Section */}
        <section className="py-12 bg-secondary rounded-lg">
             <div className="container mx-auto max-w-3xl">
                <h2 className="text-3xl font-bold text-center mb-8">Häufig gestellte Fragen (FAQ)</h2>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger className="text-lg">Wie viele Rechnungen kann ich pro Monat erstellen?</AccordionTrigger>
                        <AccordionContent className="text-base">
                            Du kannst bis zu 10.000 Rechnungen pro Monat generieren. Das sollte auch für sehr aktive Shops problemlos ausreichen.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger className="text-lg">Wo finde ich die richtige CSV-Datei bei Etsy?</AccordionTrigger>
                        <AccordionContent className="text-base">
                            Gehe in deinem Etsy-Dashboard zu: <br />
                            <strong>Shop-Manager → Einstellungen → Optionen → Daten herunterladen</strong>. <br />
                            Wähle dort im Bereich "Bestellungen" als Typ **"Bestellte Artikel"** aus. Anschließend kannst du den gewünschten Monat und das Jahr auswählen und die CSV herunterladen.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
             </div>
        </section>
        
        {/* SEO Text Section */}
        <section className="py-20">
            <div className="container mx-auto max-w-3xl prose dark:prose-invert">
                <h2 className="text-2xl font-bold">Warum die Automatisierung deiner Etsy-Buchhaltung entscheidend ist</h2>
                <p>
                    Als Etsy-Verkäufer kennst du das: Deine Leidenschaft liegt im Herstellen und Verkaufen einzigartiger Produkte, nicht in der Buchhaltung. Doch eine saubere Rechnungslegung ist entscheidend für den Erfolg deines Shops. Manuell Rechnungen zu erstellen ist nicht nur zeitaufwändig, sondern auch fehleranfällig. Jede Minute, die du mit administrativen Aufgaben verbringst, ist eine Minute, die du nicht in dein Kerngeschäft investieren kannst. Unser Tool nimmt dir diese Last ab.
                </p>
            </div>
        </section>
    </div>
  );
}
