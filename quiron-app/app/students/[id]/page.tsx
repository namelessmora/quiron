"use client";

type Props = {
  params: {
    id: string;
  };
};

export default function StudentDetail({
  params,
}: Props) {
  return (
    <div className="p-10">
      <h1 className="text-5xl font-bold mb-4">
        Perfil Alumno
      </h1>

      <p>
        ID: {params.id}
      </p>
    </div>
  );
}