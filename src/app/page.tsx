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
    price, 
    features 
}: { 
    title: string, 
    price: string, 
    features: string[]
}) => (
    <Card className="h-full flex flex-col">
        <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <p className="text-lg font-semibold text-primary">{price}</p>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
            <div className="space-y-3 mb-6 flex-1">
                {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
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
                Etsy Rechnungen automatisch erstellen – schnell & einfach
            </h1>
            <p className="text-lg md:text-xl text-black mb-8 max-w-2xl mx-auto">
                Ihre Verkäufe, Ihre Daten, Ihre Rechnungen – in nur wenigen Klicks zum Download.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                    <Link href="/register">30 Rechnungen gratis erstellen</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                    <Link href="/login">Anmelden</Link>
                </Button>
            </div>
        </section>



        {/* Step-by-Step Section */}
        <section className="py-20">
            <div className="container mx-auto text-center">
                                 <h2 className="text-3xl font-bold mb-10 text-black">Rechnungen erstellen in 3 einfachen Schritten</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                       <Step 
                         icon={<GanttChartSquare size={48} />}
                         title="1. Firmendaten eingeben"
                         description="Geben Sie einmalig die Firmendaten ein, die auf den Rechnungen erscheinen sollen."
                    />
                     <Step 
                         icon={<Download size={48} />}
                         title="2. Etsy-CSV-Datei hochladen"
                         description="Importieren Sie die von Etsy bereitgestellte Verkaufsdatei."
                    />
                     <Step 
                         icon={<FileUp size={48} />}
                         title="3. Rechnungen herunterladen"
                         description="Mit nur einem Klick erhalten Sie Ihre fertigen Rechnungen als PDF."
                    />
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 bg-secondary rounded-lg">
            <div className="container mx-auto">
                                 <div className="text-center mb-12">
                     <h2 className="text-3xl font-bold mb-4 text-black">Unsere Pakete für Etsy Shops</h2>
                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                     <PricingCard
                         title="Starter Paket – 7,99 € (einmalig)"
                         price=""
                         features={[
                             "500 Credits für 500 Rechnungen",
                             "Preis pro Rechnung: ~0,016 €",
                             "Nutzung für umsatzsteuerpflichtige Shops & Kleinunternehmer:innen",
                             "Rechnungen als PDF-Download",
                             "Einmalzahlung – kein Abo"
                         ]}
                     />
                     <PricingCard
                         title="Professional Paket – 9,99 € (einmalig)"
                         price=""
                         features={[
                             "1.000 Credits für 1000 Rechnungen",
                             "Preis pro Rechnung: ~0,010 €",
                             "Nutzung für umsatzsteuerpflichtige Shops & Kleinunternehmer:innen",
                             "Rechnungen als PDF-Download",
                             "Einmalzahlung – kein Abo"
                         ]}
                     />
                     <PricingCard
                         title="Business Paket – 19,99 € (einmalig)"
                         price=""
                         features={[
                             "3.000 Credits für 3000 Rechnungen",
                             "Preis pro Rechnung: ~0,0067 €",
                             "Nutzung für umsatzsteuerpflichtige Shops & Kleinunternehmer:innen",
                             "Rechnungen als PDF-Download",
                             "Einmalzahlung – kein Abo"
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
        
                 {/* Trust Icons Section */}
         <section className="py-12 bg-secondary rounded-lg">
             <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                 <TrustIcon
                     icon={<Check className="w-6 h-6" />}
                     title="DSGVO-konform"
                     description="Sichere Verarbeitung Ihrer Daten auf deutschen Servern."
                 />
                 <TrustIcon
                     icon={<Check className="w-6 h-6" />}
                     title="Transparent & Fair"
                     description="Einmalige Zahlung – kein Abo."
                 />
                  <TrustIcon
                     icon={<Check className="w-6 h-6" />}
                     title="Flexibel für Ihr Business"
                     description="Rechnungen mit oder ohne USt. (Kleinunternehmer)."
                 />
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
