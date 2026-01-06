import type { SVGProps } from 'react';

const baseSvgProps: SVGProps<SVGSVGElement> = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg {...baseSvgProps} {...props}>
    {children}
  </svg>
);

export const CheckIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M5 13l4 4L19 7" />
  </Icon>
);

export const UsersIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M2 21v-1.5A3.5 3.5 0 015.5 16H9a3.5 3.5 0 013.5 3.5V21" />
    <circle cx="7.5" cy="8" r="3.5" />
    <path d="M15 10.5a3 3 0 100-6" />
    <path d="M21.5 21v-1.5c0-1.7-1.2-3.2-2.9-3.5" />
  </Icon>
);

export const BookOpenIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M2.5 5.5h7a2.5 2.5 0 012.5 2.5v12a2.5 2.5 0 00-2.5-2.5h-7z" />
    <path d="M21.5 5.5h-7a2.5 2.5 0 00-2.5 2.5v12a2.5 2.5 0 012.5-2.5h7z" />
  </Icon>
);

export const MessageIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M4 6h16v10H8l-4 4z" />
  </Icon>
);

export const TrendingUpIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M3 17l5-5 4 4L21 7" />
    <path d="M14 7h7v7" />
  </Icon>
);

export const ClockIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7v5l3 3" />
  </Icon>
);

export const MapPinIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M12 21s-6-5.3-6-9a6 6 0 1112 0c0 3.7-6 9-6 9z" />
    <circle cx="12" cy="12" r="2.2" />
  </Icon>
);

export const AlertCircleIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <circle cx="12" cy="16" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
);

export const CheckCircleIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </Icon>
);

export const ChevronLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M15 18l-6-6 6-6" />
  </Icon>
);

export const ChevronRightIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const CloseIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <path d="M6 6l12 12" />
    <path d="M18 6l-12 12" />
  </Icon>
);

export const LoaderIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8" strokeOpacity="0.25" />
    <path d="M20 12a8 8 0 00-8-8" />
  </Icon>
);

export const CalculatorIcon = (props: SVGProps<SVGSVGElement>) => (
  <Icon {...props}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 7h6" />
    <path d="M9 12h.01" />
    <path d="M12 12h.01" />
    <path d="M15 12h.01" />
    <path d="M9 15h.01" />
    <path d="M12 15h.01" />
    <path d="M15 15h.01" />
  </Icon>
);



