import { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { IconButton } from '../components/IconButton';
import { MomentBubble } from '../components/MomentBubble';
import { PostCard } from '../components/PostCard';
import { SegmentedControl } from '../components/SegmentedControl';
import { Wordmark } from '../components/Wordmark';
import { moments, posts } from '../data/sample';
import './Showcase.css';

/*
 * Trin 1: oversigt over de fælles komponenter, så de kan ses og afprøves
 * på telefonen. Erstattes af Hjem-skærmen i trin 3.
 */
export function Showcase() {
  const [chips, setChips] = useState<number[]>([1]);
  const [segment, setSegment] = useState<'1' | '2' | '3'>('1');
  const toggleChip = (c: number) =>
    setChips((list) => (list.includes(c) ? list.filter((x) => x !== c) : [...list, c]));

  return (
    <div className="showcase">
      <Section title="Wordmark">
        <Wordmark />
      </Section>

      <Section title="Knap">
        <div className="showcase__row">
          <Button>Del igen</Button>
          <Button variant="secondary">Del igen</Button>
          <Button variant="highlight">Del igen</Button>
          <Button variant="ghost">Del igen</Button>
        </div>
      </Section>

      <Section title="Chip">
        <div className="showcase__row">
          {[0, 1].map((c) => (
            <Chip key={c} selected={chips.includes(c)} onClick={() => toggleChip(c)}>
              Møbler
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Avatar">
        <div className="showcase__row showcase__row--center">
          <Avatar name="Mette Lund" tone="sand" size="S" />
          <Avatar name="Mette Lund" tone="sand" size="M" />
          <Avatar name="Mette Lund" tone="sand" size="L" />
          <Avatar name="Mette Lund" tone="blue" size="L" />
          <Avatar name="Mette Lund" tone="sage" size="L" />
          <Avatar name="Mette Lund" tone="rose" size="L" />
        </div>
      </Section>

      <Section title="Ikon-knap">
        <div className="showcase__row">
          <IconButton icon="search" label="Søg" variant="outline" />
          <IconButton icon="search" label="Søg" variant="filled" />
          <IconButton icon="search" label="Søg" variant="ghost" />
        </div>
      </Section>

      <Section title="Segmenteret valg">
        <SegmentedControl
          label="Eksempel"
          value={segment}
          onChange={setSegment}
          options={[
            { value: '1', label: 'Valg 1' },
            { value: '2', label: 'Valg 2' },
            { value: '3', label: 'Valg 3' },
          ]}
        />
      </Section>

      <Section title="Moments">
        <div className="showcase__row showcase__row--scroll">
          <MomentBubble name="Dig" state="add" />
          {moments.map((m) => (
            <MomentBubble key={m.name} name={m.name} state={m.state} tone={m.tone} />
          ))}
        </div>
      </Section>

      <Section title="Opslag">
        <div className="showcase__stack">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="showcase__section">
      <h2 className="t-heading-s">{title}</h2>
      {children}
    </section>
  );
}
