import React from 'react';
import '../tokens/colors.css';
import '../tokens/spacing.css';
import '../tokens/typography.css';
import '../tokens/effects.css';
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'metallic' | 'holographic' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    active?: boolean;
}
export declare const Button: React.FC<ButtonProps>;
//# sourceMappingURL=Button.d.ts.map