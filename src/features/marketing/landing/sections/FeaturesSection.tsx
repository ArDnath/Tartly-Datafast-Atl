import '../journey/journey.css';
import { RevenueJourney } from '../journey/RevenueJourney';

/**
 * The landing page's product explanation. The journey owns its own scroll
 * state and scenes; this section is only the route-level mount point.
 */
export function FeaturesSection() {
  return <RevenueJourney />;
}
