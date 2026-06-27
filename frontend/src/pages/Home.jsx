import HeroSection    from '../components/MainSection';
import VouchersSection from '../components/VouchersSection';
import HowToSection   from '../components/RedeemGuide';

/**
 * @param {{ onExplore: (id: number) => void, onViewAll: () => void }} props
 */
const Home = ({ onExplore, onViewAll }) => {
  return (
    <main className="main-content container-max page-px">
      <HeroSection />
      <VouchersSection onExplore={onExplore} onViewAll={onViewAll} />
      <HowToSection />
    </main>
  );
};

export default Home;