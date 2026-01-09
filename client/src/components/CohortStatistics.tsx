import type { Statistics } from "../types";
import ElectivePreferenceSatisfactionChart from "./ElectivePreferenceSatisfactionChart";
// import OptimisationScoreTable from "./OptimisationScoreTable";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
// import { Separator } from "./ui/separator";

type Props = {
  statistics: Statistics;
};

const CohortStatistics: React.FC<Props> = ({ statistics }) => {
  const { total_residents, cohort } = statistics;
  const { elective_preference_satisfaction } = cohort;

  // Map optimisation scores to resident scores with actual names
  // const mappedScores = optimisation_scores.map((score, index) => {
  //   const resident = residents[index];
  //   return {
  //     residentName: resident ? resident.name : `Resident ${index + 1}`,
  //     score: score,
  //   };
  // });

  return (
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle>Cohort Statistics</CardTitle>
        <CardDescription>Total Residents: {total_residents}</CardDescription>
      </CardHeader>

      {/* histogram of optimisation scores */}
      <CardContent className="space-y-6">
        {/* <p className="text-sm font-medium">Optimisation Scores</p>
        <OptimisationScoreTable scores={mappedScores} />
        <Separator /> */}
        <p className="text-sm font-medium">Elective Preference Satisfaction</p>
        <ElectivePreferenceSatisfactionChart
          data={elective_preference_satisfaction}
        />
      </CardContent>
    </Card>
  );
};

export default CohortStatistics;
