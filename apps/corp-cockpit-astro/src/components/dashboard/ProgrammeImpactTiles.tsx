import ProgrammeTiles from './ProgrammeTiles';

interface ProgrammeImpactTilesProps {
  companyId: string;
}

/**
 * Programme Impact Tiles Container
 * ProgrammeTiles reads filter from URL params (set by ProgrammeSelectorHeader in header)
 */
export default function ProgrammeImpactTiles({ companyId }: ProgrammeImpactTilesProps) {
  return (
    <div className="programme-impact-tiles-container">
      <ProgrammeTiles companyId={companyId} period="month" />
    </div>
  );
}
