const STEPS = [
  {
    number: 1,
    title: 'Browse & Select',
    description: 'Explore available deals and pick the voucher that fits your needs.',
  },
  {
    number: 2,
    title: 'Check the Details',
    description: 'Review the terms, validity, and what each voucher includes before claiming.',
  },
  {
    number: 3,
    title: 'Redeem Instantly',
    description: 'Click redeem to claim your value or get your digital pass. Enjoy your rewards and benefits!',
  },
];

const HowToSection = () => {
  return (
    <section className="how-to-section">
      <div className="how-to-section__heading">
        <h2 className="text-headline-md">How to Redeem Your Voucher</h2>
      </div>

      <div className="steps-grid">
        {STEPS.map(({ number, title, description }) => (
          <div className="step" key={number}>
            <div className="step__number">{number}</div>
            <div className="step__content">
              <h3 className="step__title">{title}</h3>
              <p className="step__desc">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowToSection;