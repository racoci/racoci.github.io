import React from 'react';
import ComplexPlotter from '../../../../components/complex-plotter/ComplexPlotter';

export const metadata = {
  title: 'Complex Function Plotter | Lucas Racoci',
  description: 'Interactive domain coloring and complex function plotter in WebGL.',
};

export default async function ComplexPlotterPage({ params }: { params: Promise<{ lang: 'en' | 'pt' }> }) {
  const { lang } = await params;
  return (
    <main className="w-full h-full bg-zinc-950">
      <ComplexPlotter lang={lang} />
    </main>
  );
}