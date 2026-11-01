import React from 'react';
import type { Tip } from '../tips';
import { money0 } from '../util';
import { IconBulb, IconHouse } from './Icons';

export const TipList: React.FC<{ tips: Tip[]; goalName: string }> = ({ tips, goalName }) => (
  <div className="tips">
    {tips.map(t => (
      <div className="tip" key={t.id}>
        <span className="tip-ico" aria-hidden="true"><IconBulb /></span>
        <strong>{t.title}</strong>
        <p>{t.body}</p>
        {t.saving && t.goalDays && t.goalDays >= 3 ? (
          <span className="gain"><IconHouse />
            {t.yearly
              ? `${money0(t.saving * 12)} a year = your ${goalName.toLowerCase()} about ${t.goalDays} days sooner`
              : `${money0(t.saving)} = ${t.goalDays} days of saving for your ${goalName.toLowerCase()}`}
          </span>
        ) : null}
      </div>
    ))}
  </div>
);
