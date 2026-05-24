type Evaluation = {
  id?: string;
  area: string;
  evaluator: string;
  grade: number;
  comments: string;
  date: string;
};

type Props = {
  evaluation: Evaluation;

  onDelete: (
    evaluationId: string
  ) => void;

  onEdit: (
    evaluation: Evaluation
  ) => void;
};

export default function EvaluationCard({
  evaluation,
  onDelete,
  onEdit,
}: Props) {

  return (
    <div
      className={`border rounded-2xl p-5

        ${
          evaluation.grade === 1
            ? "border-red-200 bg-red-50"
            : "border-gray-100"
        }
      `}
    >

      <div className="flex items-center justify-between mb-3">

        <div>

          <p className="font-semibold text-gray-800">
            {evaluation.area}
          </p>

          <p className="text-sm text-gray-400">
            {evaluation.evaluator}
          </p>

        </div>

        <div className="flex items-center gap-4">

          <div className="text-right">

            <p className="text-2xl font-bold text-[#4f6ef7]">
              {evaluation.grade}
            </p>

            <p className="text-sm text-gray-400">
              {evaluation.date}
            </p>

          </div>

          <div className="flex flex-col items-end gap-2">

            <button
              onClick={() =>
                onEdit(evaluation)
              }
              className="text-[#4f6ef7] hover:text-[#3955d6] text-sm font-medium"
            >
              Editar
            </button>

            <button
              onClick={() =>
                onDelete(
                  evaluation.id!
                )
              }
              className="text-red-500 hover:text-red-700 text-sm font-medium"
            >
              Eliminar
            </button>

          </div>

        </div>

      </div>

      {evaluation.grade === 1 && (
        <p className="text-red-500 text-sm mb-3">
          Evaluación reprobada por criterio crítico
        </p>
      )}

      <p className="text-gray-600">
        {evaluation.comments ||
          "Sin comentarios"}
      </p>

    </div>
  );
}