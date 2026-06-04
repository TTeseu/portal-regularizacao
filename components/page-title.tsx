export function PageTitle({
  title,
  subtitle,
  action
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-white">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm font-medium text-edp-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
