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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "faktorino",
            "description": "Automatische Etsy Rechnungserstellung - Erstellen Sie professionelle Rechnungen in Sekunden",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "url": "https://faktorino.de",
            "offers": {
              "@type": "Offer",
              "price": "7.99",
              "priceCurrency": "EUR",
              "description": "Starter Paket - 500 Credits für 500 Rechnungen"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.8",
              "ratingCount": "150"
            },
            "provider": {
              "@type": "Organization",
              "name": "faktorino",
              "url": "https://faktorino.de"
            }
          })
        }}
      />
      <div className="w-full">
        {/* Hero Section */}
        <section className="text-center py-20">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-black mb-4 font-headline">
                Etsy Rechnungen automatisch erstellen – schnell & einfach
            </h1>
            <p className="text-lg md:text-xl text-black mb-8 max-w-2xl mx-auto">
                Mit faktorino konvertieren Sie Ihre CSV-Datei zu Rechnungen – in nur wenigen Klicks.
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
                         description="Unser Etsy-CSV Konverter verarbeitet Ihre Verkaufsdaten automatisch und erstellt im Hintergrund die Rechnungen."
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
                         title="Starter Paket – 7,99 €"
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
                         title="Professional Paket – 9,99 €"
                         price=""
                         features={[
                             "1.000 Credits für 1.000 Rechnungen",
                             "Preis pro Rechnung: ~0,010 €",
                             "Nutzung für umsatzsteuerpflichtige Shops & Kleinunternehmer:innen",
                             "Rechnungen als PDF-Download",
                             "Einmalzahlung – kein Abo"
                         ]}
                     />
                     <PricingCard
                         title="Business Paket – 19,99 €"
                         price=""
                         features={[
                             "3.000 Credits für 3.000 Rechnungen",
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
                         <AccordionTrigger className="text-lg">Was macht faktorino genau?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             faktorino ist ein spezialisiertes Tool, das automatisch Etsy Rechnungen erstellt. Statt jede Rechnung manuell zu schreiben, laden Sie einfach Ihre Etsy-CSV-Datei hoch, geben Ihre Daten ein und erhalten sofort fertige Rechnungen als PDFs.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-2">
                         <AccordionTrigger className="text-lg">Kann ich faktorino kostenlos testen?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Ja. Sie können faktorino unverbindlich testen und bis zu 30 Etsy Rechnungen kostenlos erstellen. Erst danach benötigen Sie ein Paket.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-3">
                         <AccordionTrigger className="text-lg">Für welche Verkäufer:innen eignet sich faktorino?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             faktorino funktioniert sowohl für umsatzsteuerpflichtige Verkäufer:innen als auch für diejenigen, die unter die Kleinunternehmerregelung fallen.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-4">
                         <AccordionTrigger className="text-lg">In welchem Format werden die Rechnungen ausgegeben?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Alle Rechnungen stehen Ihnen als PDF-Download zur Verfügung.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-5">
                         <AccordionTrigger className="text-lg">Wie lange dauert die Erstellung meiner Etsy Rechnungen?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Sobald die CSV-Datei hochgeladen ist, erstellt faktorino Ihre Rechnungen innerhalb weniger Sekunden.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-6">
                         <AccordionTrigger className="text-lg">Kann ich Rechnungen auch manuell bearbeiten?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Ja. faktorino erstellt Ihre Rechnungen automatisch, Sie können diese aber jederzeit individuell anpassen.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-7">
                         <AccordionTrigger className="text-lg">Wo finde ich die nötige Etsy-CSV-Datei?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Im Etsy-Dashboard unter:<br />
                             Shop-Manager → Einstellungen → Optionen → Daten herunterladen → Typ: Bestellte Artikel auswählen → Zeitraum angeben → „CSV herunterladen" klicken.
                         </AccordionContent>
                     </AccordionItem>
                     <AccordionItem value="item-8">
                         <AccordionTrigger className="text-lg">Ist faktorino ein Etsy-CSV Konverter?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Ja, faktorino ist ein spezialisierter Etsy-CSV Konverter, der Ihre Verkaufsdaten automatisch in Rechnungen umwandelt. 
                             Statt nur die Daten zu konvertieren, erstellen wir direkt professionelle Rechnungen für Sie.
                         </AccordionContent>
                     </AccordionItem>
                      <AccordionItem value="item-9">
                         <AccordionTrigger className="text-lg">Muss ich die erstellten Rechnungen testen?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Ja, faktorio dient ausschließlich der Unterstützung bei der Rechnungserstellung.
                             Es ersetzt keine steuerliche oder rechtliche Beratung.
                             Für die Richtigkeit, Vollständigkeit und rechtliche Gültigkeit der erstellten Rechnungen ist allein der Nutzer verantwortlich.
                         </AccordionContent>
                     </AccordionItem>
                      <AccordionItem value="item-10">
                         <AccordionTrigger className="text-lg">Unterstützt das Tool das OSS-Verfahren?</AccordionTrigger>
                         <AccordionContent className="text-base">
                             Nein. faktorino unterstützt das One-Stop-Shop Verfahren nicht.
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
              <div className="container mx-auto max-w-6xl">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                             <div className="prose dark:prose-invert">
                           <h2 className="text-2xl font-bold mb-6">Etsy Rechnungen einfach erstellen – mit faktorino Zeit sparen</h2>
                           <p>
                               Wer auf Etsy verkauft, kennt die Herausforderung: Mit jeder Bestellung steigt auch die Arbeit rund um die Rechnungen. Viele Verkäufer:innen schreiben Rechnungen noch manuell – mit Tabellen, Vorlagen oder Copy & Paste. Das kostet Zeit, ist fehleranfällig und macht wenig Freude. faktorino bietet die Lösung.
                           </p>
                          
                          <p>
                              Mit faktorino erstellen Sie Etsy Rechnungen automatisch. Alles, was Sie brauchen, ist die CSV-Datei aus Ihrem Etsy-Dashboard. Einmal hochgeladen, generiert das Tool innerhalb weniger Sekunden fertige Rechnungen zum Download.
                          </p>
                          
                          <h3 className="text-xl font-bold mt-8 mb-4">Etsy-CSV Konverter mit Rechnungserstellung</h3>
                          <p>
                              faktorino ist mehr als nur ein Etsy-CSV Konverter – wir wandeln Ihre Verkaufsdaten automatisch in Rechnungen um. 
                              Laden Sie Ihre Etsy-CSV-Datei hoch und erhalten Sie sofort Rechnungen als PDF.
                          </p>
                          
                          <h3 className="text-xl font-bold mt-8 mb-4">Automatisierung statt Handarbeit</h3>
                          <p>
                              Stundenlang Daten kopieren, Rechnungen einzeln speichern oder manuell anpassen – das gehört der Vergangenheit an. faktorino reduziert den Aufwand auf wenige Klicks: CSV hochladen, Rechnungen erstellen, prüfen, herunterladen.
                          </p>
                          
                      </div>
                      
                      <div className="prose dark:prose-invert">
                          <p>
                              Ob Sie als umsatzsteuerpflichtige:r Verkäufer:in arbeiten oder die Kleinunternehmerregelung nutzen – faktorino unterstützt beide Varianten. So können alle Etsy Shops unabhängig von ihrer steuerlichen Situation das Tool sofort einsetzen.
                          </p>
                          
                          <h3 className="text-xl font-bold mt-8 mb-4">PDF-Download und volle Kontrolle</h3>
                          <p>
                              Alle Rechnungen stehen Ihnen im PDF-Format zur Verfügung – ideal für die eigene Ablage, den Versand an Kund:innen oder für die Zusammenarbeit mit Steuerberater:innen. Falls Anpassungen nötig sind, können Sie jede Rechnung individuell bearbeiten.
                          </p>
                          
                          <h3 className="text-xl font-bold mt-8 mb-4">Für Shops jeder Größe geeignet</h3>
                          <p>
                              Egal ob Sie ein kleiner Etsy-Shop mit wenigen Verkäufen pro Monat sind oder bereits ein wachsender Store mit hunderten Bestellungen: faktorino passt sich an. Mit flexiblen Paketen (500, 1.000 oder 3.000 Rechnungen) zahlen Sie nur einmal und haben die volle Freiheit.
                          </p>
                          
                                                     <h3 className="text-xl font-bold mt-8 mb-4">Vorteile auch für Steuerberater:innen</h3>
                           <p>
                               Nicht nur Etsy Shops profitieren von faktorino. Auch Steuerberater:innen sparen Zeit, wenn Mandanten ihre Etsy-Daten direkt in fertige Rechnungen umwandeln können. Das schafft Klarheit, Übersicht und spart wertvolle Ressourcen.
                           </p>
                      </div>
                  </div>
              </div>
                     </section>
      </div>
    </>
   );
 }
