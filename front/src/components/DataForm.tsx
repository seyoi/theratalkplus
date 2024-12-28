import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrainingData } from "@/types/chatbot"

interface TrainingDataTableProps {
  data: TrainingData[] | null
  onDelete: (filename: string) => void
}

export function TrainingDataTable({ data, onDelete }: TrainingDataTableProps) {
  if (!data) {
    return <div>No training data available.</div>
  }
  return (
    <div>
      <h4 className="text-lg font-semibold mb-2">Training Files</h4>
      {data.map((trainingData, idx) => (
        <div key={idx} className="mb-4">
          <div>
            <strong>File Name:</strong> {trainingData.filename}
          </div>
          <div>
            <strong>Status:</strong> {trainingData.status}
          </div>
          <div>
            <strong>User ID:</strong> {trainingData.user_id}
          </div>
          <Button variant="destructive" onClick={() => onDelete(trainingData.filename)} className="mt-2">
            Delete Training Data
          </Button>
          {trainingData.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(trainingData.data[0]).map((key) => (
                    <TableHead key={key}>{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainingData.data.map((item, index) => (
                  <TableRow key={index}>
                    {Object.entries(item).map(([key, value]) => (
                      <TableCell key={key}>{value !== null ? value : "정보 없음"}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ))}
    </div>
  )
}

