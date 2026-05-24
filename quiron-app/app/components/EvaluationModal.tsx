type Props = {
  showModal: boolean;

  setShowModal: (
    value: boolean
  ) => void;

  student: any;

  area: string;
  setArea: (value: string) => void;

  evaluator: string;
  setEvaluator: (
    value: string
  ) => void;

  comments: string;
  setComments: (
    value: string
  ) => void;

  manualGrade: string;
  setManualGrade: (
    value: string
  ) => void;

  selectedRubric: any;

  responses: any[];

  selectOption: (
    criterion: string,
    score: number
  ) => void;

  hasCriticalFail: boolean | undefined;

  rubricGrade: string;

  addEvaluation: () => void;
};

export default function EvaluationModal({
  showModal,

  setShowModal,

  student,

  area,
  setArea,

  evaluator,
  setEvaluator,

  comments,
  setComments,

  manualGrade,
  setManualGrade,

  selectedRubric,

  responses,

  selectOption,

  hasCriticalFail,

  rubricGrade,

  addEvaluation,
}: Props) {

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">

      <div className="bg-white w-full max-w-3xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between mb-6">

          <div>

            <h2 className="text-3xl font-bold text-gray-800">
              Nueva evaluación
            </h2>

            <p className="text-gray-400 mt-1">
              Registro clínico del interno
            </p>

          </div>

          <button
            onClick={() =>
              setShowModal(false)
            }
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>

        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">

          <select
            value={area}
            onChange={(e) =>
              setArea(e.target.value)
            }
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
          >
            <option value="">
              Área
            </option>

            {student.areas?.map((area: string) => (
              <option
                key={area}
                value={area}
              >
                {area}
              </option>
            ))}

          </select>

          <input
            type="text"
            placeholder="Evaluador"
            value={evaluator}
            onChange={(e) =>
              setEvaluator(
                e.target.value
              )
            }
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
          />

        </div>

        {/* RÚBRICA */}
        {selectedRubric && (

          <div className="space-y-4 mb-6">

            {selectedRubric.criteria.map(
              (criterion: any) => (

                <div
                  key={criterion.id}
                  className="border border-gray-100 rounded-2xl p-5"
                >

                  <p className="font-semibold text-gray-800 mb-4">
                    {criterion.title}
                  </p>

                  <div className="flex gap-3 flex-wrap">

                    {criterion.options.map(
                      (option: any) => (

                        <button
                          key={option.label}
                          type="button"
                          onClick={() =>
                            selectOption(
                              criterion.title,
                              option.score
                            )
                          }
                          className={`px-4 py-2 rounded-2xl border transition

                            ${
                              responses.find(
                                (
                                  response
                                ) =>
                                  response.criterion ===
                                    criterion.title &&
                                  response.score ===
                                    option.score
                              )
                                ? "bg-[#4f6ef7] text-white border-[#4f6ef7]"
                                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                            }
                          `}
                        >
                          {option.label} (
                          {option.score})
                        </button>

                      )
                    )}

                  </div>

                </div>

              )
            )}

          </div>

        )}

        {/* NOTA */}
        <div className="bg-[#eef2ff] rounded-2xl px-4 py-3 flex items-center justify-between mb-4">

          <div>

            <p className="text-[#4f6ef7] font-medium">

              {selectedRubric
                ? "Nota calculada automáticamente"
                : "Nota manual"}

            </p>

            {hasCriticalFail && (
              <p className="text-red-500 text-sm mt-1">
                Reprobado por criterio crítico
              </p>
            )}

          </div>

          {selectedRubric ? (

            <p className="text-2xl font-bold text-[#4f6ef7]">

              {hasCriticalFail
                ? "1.0"
                : rubricGrade}

            </p>

          ) : (

            <input
              type="number"
              step="0.1"
              min="1"
              max="7"
              placeholder="6.5"
              value={manualGrade}
              onChange={(e) =>
                setManualGrade(
                  e.target.value
                )
              }
              className="w-24 bg-white border border-gray-200 rounded-xl px-3 py-2 text-right font-semibold"
            />

          )}

        </div>

        <textarea
          placeholder="Comentarios"
          value={comments}
          onChange={(e) =>
            setComments(e.target.value)
          }
          className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-4"
          rows={4}
        />

        <button
          onClick={addEvaluation}
          className="w-full bg-[#4f6ef7] text-white px-6 py-4 rounded-2xl font-medium hover:opacity-90 transition"
        >
          Guardar evaluación
        </button>

      </div>

    </div>
  );
}