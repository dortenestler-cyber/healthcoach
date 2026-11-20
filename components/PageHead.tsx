export default function PageHead({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="page-head">
      <span className="page-sub">{sub}</span>
      <h1 className="page-title">{title}</h1>
    </header>
  );
}
