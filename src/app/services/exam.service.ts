import { computed, inject, Injectable, signal } from '@angular/core';
import { Question } from '../models/question.model';
import { Answer } from '../models/answer.model';
import { BehaviorSubject, switchMap, tap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { ExamGeneratorService } from './exam-generator.service';

@Injectable({
  providedIn: 'root',
})
export class ExamService {
  readonly #generateExam$ = new BehaviorSubject<number>(1);

  readonly #questions = signal<Question[]>([
    {
      caption: 'How much is 4+4',
      answers: ['4', '5', '7', '8'],
      correctAnswerIndex: 3,
    },
    {
      caption: 'How much is 5+5',
      answers: ['10', '5', '7', '8'],
      correctAnswerIndex: 0,
    },
    {
      caption: 'How much is 7+7',
      answers: ['4', '5', '7', '14'],
      correctAnswerIndex: 3,
    },
  ]);

  readonly #userAnswers = signal<number[]>([]);
  readonly #isBusy = signal<boolean>(false);

  readonly level = toSignal(this.#generateExam$);

  readonly questions = this.#questions.asReadonly();
  readonly userAnswers = computed(() => {
    const answers = this.#userAnswers();
    const questions = this.questions();

    console.log('--- computed userAnswers START ---');
    console.log('raw userAnswers signal:', answers);
    console.log('userAnswers length:', answers.length);

    console.log('raw questions signal:', questions);
    console.log('questions length:', questions.length);

    const result = answers.map<Answer>((ans, index) => {
      const question = questions[index];

      console.log('--- mapping answer ---');
      console.log('index:', index);
      console.log('ans (userAnswerIndex):', ans);
      console.log('question at index:', question);

      if (!question) {
        console.warn('⚠️ No question for index', index);
      }

      console.log('correctAnswerIndex:', question?.correctAnswerIndex);

      console.log('isCorrect:', ans === question?.correctAnswerIndex);

      return {
        userAnswerIndex: ans,
        isCorrect: ans === question?.correctAnswerIndex,
      };
    });

    console.log('computed result:', result);
    console.log('--- computed userAnswers END ---');

    return result;
  });
  readonly isBusy = this.#isBusy.asReadonly();
  readonly currentQuestionIndex = computed(() => this.userAnswers().length);
  readonly currentQuestion = computed(() => this.questions()[this.currentQuestionIndex()]);
  readonly questionsCount = computed(() => this.questions().length);
  readonly isQuizDone = computed(() => this.userAnswers().length === this.questionsCount());
  readonly correctAnswers = computed(() => this.userAnswers().filter((x) => x.isCorrect));
  readonly correctAnswersCount = computed(() => this.correctAnswers().length);

  answerCurrentQuestion(answerIndex: number) {
    this.#userAnswers.update((answers) => [...answers, answerIndex]);
  }

  increaseLevel() {
    this.#generateExam$.next(this.#generateExam$.value + 1);
  }

  decreaseLevel() {
    this.#generateExam$.next(this.#generateExam$.value - 1);
  }

  repeatLevel() {
    this.#generateExam$.next(this.#generateExam$.value);
  }

  constructor() {
    const generator = inject(ExamGeneratorService);

    this.#generateExam$
      .pipe(
        tap((level) => this.#isBusy.set(true)),
        switchMap((level) => generator.generateExam(level)),
        tap((questions) => {
          this.#questions.set(questions);
          this.#userAnswers.set([]);
          this.#isBusy.set(false);
        })
      )
      .subscribe();
  }
}
