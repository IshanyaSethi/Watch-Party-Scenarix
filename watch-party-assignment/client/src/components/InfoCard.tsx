type InfoCardProps = {
  title: string;
  items: string[];
};

export const InfoCard = ({ title, items }: InfoCardProps) => (
  <section className="panel info-card">
    <h2 className="panel-title">{title}</h2>
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </section>
);
