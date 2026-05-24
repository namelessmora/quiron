type DashboardCardProps = {
  title: string;
  value: string;
};

export default function DashboardCard({
  title,
  value,
}: DashboardCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-gray-500 mb-2">
        {title}
      </h3>

      <p className="text-5xl font-bold text-gray-800">
        {value}
      </p>
    </div>
  );
}